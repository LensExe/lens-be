import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type {
  Actor,
  Session,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { currentUser, required, page, role } from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';

@Injectable()
export class NotificationUseCases {
  async list(s: Session, a: Actor, i: Inputs.NotificationListQueryInput) {
    const u = await currentUser(s, a);
    return page(
      await s.find('notifications', { user_id: u.id }, { descending: true }),
      i,
    );
  }
  async read(s: Session, a: Actor, i: { id: string }) {
    const u = await currentUser(s, a),
      n = await required(s, 'notifications', i.id);
    ensure(n.user_id === u.id, 'Notification access denied', 'forbidden');
    return s.update('notifications', n.id, {
      read_at: n.read_at ?? new Date().toISOString(),
    });
  }
  async readAll(s: Session, a: Actor) {
    const u = await currentUser(s, a),
      rows = await s.find('notifications', { user_id: u.id, read_at: null });
    for (const n of rows)
      await s.update('notifications', n.id, {
        read_at: new Date().toISOString(),
      });
    return { updated: rows.length };
  }
  async create(
    s: Session,
    a: Actor,
    i: { user_id: string; title: string; body: string },
  ) {
    role(a, 'internal', 'system');
    await currentUser(s, a);
    await required(s, 'users', i.user_id);
    const event = await s.insert('outbox_events', {
      topic: 'notification.created',
      recipient_ids: [i.user_id],
      payload: { title: i.title, body: i.body },
    });
    return s.insert('notifications', { ...i, event_id: event.id });
  }
  // Idempotent consumer called by the infrastructure outbox worker for
  // NOTI-005 booking.*, NOTI-006 payment.*, NOTI-007 gallery.ready.
  async consume(
    s: Session,
    event: { id: string; topic: string; recipient_ids: string[]; payload: any },
  ) {
    for (const user_id of event.recipient_ids) {
      const [existing] = await s.find('notifications', {
        user_id,
        event_id: event.id,
      });
      if (!existing)
        await s.insert('notifications', {
          user_id,
          event_id: event.id,
          title: event.topic,
          body: JSON.stringify(event.payload),
        });
    }
  }
}
