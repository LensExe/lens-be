import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { DataSource } from 'typeorm';
import { runExclusive } from '../src/features/workers/scheduled-job';

/** DataSource giả: mỗi query runner là một session, cùng chia sẻ bảng advisory lock. */
function fakeDataSource() {
  const held = new Set<string>();
  let released = 0;
  const dataSource = {
    createQueryRunner: () => ({
      connect: async () => {},
      release: async () => {
        released++;
      },
      query: async (sql: string, [name]: [string]) => {
        if (sql.includes('pg_try_advisory_lock')) {
          if (held.has(name)) return [{ locked: false }];
          held.add(name);
          return [{ locked: true }];
        }
        held.delete(name);
        return [{ pg_advisory_unlock: true }];
      },
    }),
  } as unknown as DataSource;
  return { dataSource, held, released: () => released };
}

test('runExclusive runs the job and releases the lock', async () => {
  const fake = fakeDataSource();
  let runs = 0;

  const ran = await runExclusive(fake.dataSource, 'job-a', async () => {
    runs++;
  });

  assert.equal(ran, true);
  assert.equal(runs, 1);
  assert.equal(fake.held.size, 0);
  assert.equal(fake.released(), 1);
});

test('runExclusive skips when another run holds the same job lock', async () => {
  const fake = fakeDataSource();
  let inner: boolean | undefined;
  let innerRuns = 0;

  await runExclusive(fake.dataSource, 'job-a', async () => {
    inner = await runExclusive(fake.dataSource, 'job-a', async () => {
      innerRuns++;
    });
  });

  assert.equal(inner, false);
  assert.equal(innerRuns, 0);
  assert.equal(fake.released(), 2);
});

test('runExclusive releases the lock when the job throws', async () => {
  const fake = fakeDataSource();

  await assert.rejects(
    runExclusive(fake.dataSource, 'job-a', async () => {
      throw new Error('boom');
    }),
    /boom/,
  );

  assert.equal(fake.held.size, 0);
  assert.equal(fake.released(), 1);
});
