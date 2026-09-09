import type {
  Actor,
  Session,
} from '../database/unit-of-work/unit-of-work.port';
import { ensure } from '../platform/exceptions/domain.error';
import type { EntityMap, TableName } from '../database/records/records';

export async function required<K extends TableName>(
  s: Session,
  table: K,
  id: string,
): Promise<EntityMap[K]> {
  const row = await s.get(table, id);
  ensure(row, `${table} not found`, 'missing');
  return row;
}

export async function currentUser(s: Session, actor: Actor) {
  const [user] = await s.find('users', { keycloak_id: actor.sub });
  ensure(user, 'Register your user profile first', 'forbidden');
  ensure(user.status === 'active', 'Account suspended', 'forbidden');
  return user;
}

export function role(actor: Actor, ...roles: string[]) {
  ensure(
    roles.some((r) => actor.roles.includes(r)),
    'Role is not authorized',
    'forbidden',
  );
}

export async function photographer(s: Session, actor: Actor) {
  const user = await currentUser(s, actor);
  const [p] = await s.find('photographers', { user_id: user.id });
  ensure(p, 'Photographer profile required', 'forbidden');
  return p;
}

export async function bookingAccess(
  s: Session,
  actor: Actor,
  id: string,
  side?: 'customer' | 'photographer',
) {
  const user = await currentUser(s, actor),
    booking = await required(s, 'bookings', id);
  const c = await required(s, 'customers', booking.customer_id),
    p = await required(s, 'photographers', booking.photographer_id);
  const owner =
    side === 'customer'
      ? c.user_id === user.id
      : side === 'photographer'
        ? p.user_id === user.id
        : [c.user_id, p.user_id].includes(user.id);
  ensure(
    owner ||
      (!side && actor.roles.some((r) => ['admin', 'system'].includes(r))),
    'Booking access denied',
    'forbidden',
  );
  return {
    booking,
    user,
    customer: c,
    photographer: p,
    recipients: [c.user_id, p.user_id],
  };
}

export async function emit(
  s: Session,
  topic: string,
  recipient_ids: string[],
  payload: Record<string, unknown>,
) {
  await s.insert('outbox_events', {
    topic,
    recipient_ids: [...new Set(recipient_ids)],
    payload,
  });
}

export function page<T>(rows: T[], query: { limit?: number; offset?: number }) {
  const offset = query.offset ?? 0,
    limit = query.limit ?? 20;
  return {
    items: rows.slice(offset, offset + limit),
    total: rows.length,
    offset,
    limit,
  };
}
