import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { DataSource } from 'typeorm';
import { OutboxWorker } from '../src/features/workers/outbox.worker';
import type { RealtimePublisher } from '../src/shared/integrations/realtime/realtime-publisher.port';

type Row = {
  id: string;
  topic: string;
  recipient_ids: string[];
  payload: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
  attempts: number;
  last_error: string | null;
  failed_at: string | null;
};

/** Bảng outbox_events giả trong RAM, đủ các hàm worker dùng. */
function fakeOutbox(rows: Row[]) {
  const table = new Map(rows.map((row) => [row.id, { ...row }]));
  const pending = (row?: Row) => row && !row.processed_at && !row.failed_at;
  const manager = {
    find: async () => [...table.values()].filter((row) => pending(row)),
    findOneBy: async (_entity: unknown, where: { id: string }) =>
      table.get(where.id) ?? null,
    findOne: async (_entity: unknown, options: { where: { id: string } }) => {
      const row = table.get(options.where.id);
      return pending(row) ? { ...row } : null;
    },
    getRepository: () => ({
      preload: async (changes: Partial<Row> & { id: string }) => ({
        ...table.get(changes.id),
        ...changes,
      }),
      save: async (row: Row) => {
        table.set(row.id, row);
        return row;
      },
    }),
  };
  const dataSource = {
    manager,
    transaction: (work: (s: typeof manager) => Promise<unknown>) =>
      work(manager),
  } as unknown as DataSource;
  return { dataSource, table };
}

function row(id: string): Row {
  return {
    id,
    topic: 'booking.created',
    recipient_ids: ['u1'],
    payload: { booking_id: 'b1' },
    created_at: '2026-09-25T00:00:00.000Z',
    processed_at: null,
    attempts: 0,
    last_error: null,
    failed_at: null,
  };
}

function publisher(fail: boolean) {
  const calls: string[] = [];
  const realtime = {
    publish: (_ids: string[], topic: string) => {
      calls.push(topic);
      return fail
        ? Promise.reject(new Error('socket down'))
        : Promise.resolve();
    },
  } as unknown as RealtimePublisher;
  return { realtime, calls };
}

test('outbox marks an event processed only after publish succeeds', async () => {
  const { dataSource, table } = fakeOutbox([row('e1')]);
  const { realtime, calls } = publisher(false);
  const worker = new OutboxWorker(dataSource, realtime);

  await worker.tick();
  await worker.tick();

  assert.equal(calls.length, 1);
  assert.ok(table.get('e1')?.processed_at);
});

test('outbox keeps a failed event pending and counts the attempt', async () => {
  const { dataSource, table } = fakeOutbox([row('e1')]);
  const { realtime } = publisher(true);
  const worker = new OutboxWorker(dataSource, realtime);

  await worker.tick();

  const event = table.get('e1');
  assert.equal(event?.processed_at, null);
  assert.equal(event?.attempts, 1);
  assert.match(event?.last_error ?? '', /socket down/);
});

test('outbox dead-letters an event after 5 failed attempts', async () => {
  const { dataSource, table } = fakeOutbox([row('e1')]);
  const { realtime, calls } = publisher(true);
  const worker = new OutboxWorker(dataSource, realtime);

  for (let i = 0; i < 6; i++) await worker.tick();

  const event = table.get('e1');
  assert.equal(calls.length, 5);
  assert.equal(event?.attempts, 5);
  assert.ok(event?.failed_at);
  assert.equal(event?.processed_at, null);
});
