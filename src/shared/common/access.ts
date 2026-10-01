import type { EntityManager, EntityTarget, FindOptionsWhere } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import type { Actor } from '../platform/auth/actor';
import { ensure } from '../platform/exceptions/domain.error';
import type { EntityFor, TableName } from '../database/entities';

/**
 * Find a record by `id` in the specified table.
 * If no record is found, immediately throw a 404 Not Found exception (`table not found`).
 *
 * @param s TypeORM EntityManager, possibly within a transaction.
 * @param table Table or schema name defined in EntitySchemas (for example, `users` or `bookings`).
 * @param id ID (UUID) of the record to find.
 * @returns Record found, with the corresponding entity type.
 * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
 */
export async function required<K extends TableName>(
  s: EntityManager,
  table: K,
  id: string,
): Promise<EntityFor<K>> {
  const target = EntitySchemas[table] as EntityTarget<EntityFor<K>>;
  const row = await s.findOneBy(target, { id } as unknown as FindOptionsWhere<
    EntityFor<K>
  >);
  ensure(row, `${table} not found`, 'missing');
  return row;
}

/**
 * Get the current User (Actor) from the authentication token.
 * Also check these two prerequisites:
 * 1. The user exists in the backend database (otherwise return 403 and require profile registration).
 * 2. The user is in the 'active' state (if 'suspended', return 403 because the account is locked).
 *
 * @param s TypeORM EntityManager.
 * @param actor Actor making the request, from the Keycloak JWT.
 * @returns Logged-in user’s `UserEntity` record.
 * @throws {DomainError} Thrown when the actor is not authorized.
 */
export async function currentUser(s: EntityManager, actor: Actor) {
  const [user] = await s.findBy(EntitySchemas.users, {
    keycloak_id: actor.sub,
  });
  ensure(user, 'Register your user profile first', 'forbidden');
  ensure(user.status === 'active', 'Account suspended', 'forbidden');
  return user;
}

/**
 * Check role-based access control (RBAC).
 * Ensure the Actor has at least one of the required roles.
 * If not, throw a 403 Forbidden exception.
 *
 * @param actor Actor making the request.
 * @param roles Roles allowed to access the operation (for example, `admin` or `photographer`).
 * @returns No value is returned.
 * @throws {DomainError} Thrown when the actor is not authorized.
 */
export function role(actor: Actor, ...roles: string[]) {
  ensure(
    roles.some((r) => actor.roles.includes(r)),
    'Role is not authorized',
    'forbidden',
  );
}

/**
 * Check for and retrieve the current User's Photographer profile.
 * Ensure the User has successfully registered a Photographer profile.
 *
 * @param s TypeORM EntityManager.
 * @param actor Actor making the request.
 * @returns `PhotographerEntity` record for the user.
 * @throws {DomainError} Thrown when the actor is not authorized.
 */
export async function photographer(s: EntityManager, actor: Actor) {
  const user = await currentUser(s, actor);
  const [p] = await s.findBy(EntitySchemas.photographers, { user_id: user.id });
  ensure(p, 'Photographer profile required', 'forbidden');
  return p;
}

/**
 * Get a Photographer profile for public display (customer profile views, portfolios, booking plans, etc.).
 * Show only photographers approved by an admin (`verified`) whose accounts are still 'active'.
 * Otherwise return 404 so external users cannot distinguish between a profile that is unapproved, locked, or nonexistent.
 *
 * @param s TypeORM EntityManager.
 * @param id Photographer profile ID (`photographers.id`).
 * @returns Photographer profile and its owner user.
 * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
 */
export async function publicPhotographer(s: EntityManager, id: string) {
  const p = await required(s, 'photographers', id),
    u = await required(s, 'users', p.user_id);
  ensure(
    u.status === 'active' && p.verification_status === 'verified',
    'Photographer not found',
    'missing',
  );
  return { photographer: p, user: u };
}

/**
 * Check access to a booking.
 * Verify whether the current user is the booking's Customer or Photographer,
 * or an Admin/System actor.
 *
 * @param s TypeORM EntityManager.
 * @param actor Actor making the request.
 * @param id Booking ID.
 * @param side Optional restriction to a specific role:
 * - 'customer': the caller must be the customer who created this booking.
 * - 'photographer': the caller must be the photographer assigned to this booking.
 * - undefined: either party is allowed, as are admins and system actors.
 * @returns Object containing the booking, user, customer, photographer, and `recipient_ids` to notify.
 * @throws {DomainError} Thrown when the actor is not authorized.
 */
export async function bookingAccess(
  s: EntityManager,
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

/**
 * Save the event to the Outbox (`outbox_events`) in the same transaction as the primary operation (Outbox Pattern).
 * Background workers (OutboxWorker) scan this table and later dispatch real-time notifications, push notifications, or webhooks.
 *
 * @param s TypeORM EntityManager for the current transaction.
 * @param topic Topic or event type (for example, `booking.created` or `payment.success`).
 * @param recipient_ids `user_id` values for event recipients; duplicates are removed.
 * @param payload Detailed event payload.
 * @returns No value is returned.
 */
export async function emit(
  s: EntityManager,
  topic: string,
  recipient_ids: string[],
  payload: Record<string, unknown>,
) {
  await s.save(EntitySchemas.outbox_events, {
    topic,
    recipient_ids: [...new Set(recipient_ids)],
    payload,
  });
}

/**
 * In-memory pagination utility for an array of data.
 *
 * @param rows Rows to paginate.
 * @param query Object containing `limit` (page size) and `offset` (starting position).
 * @returns Standard paginated result containing the current page’s `items`, `total`, `offset`, and `limit`.
 */
export function page<T>(rows: T[], query: { limit?: number; offset?: number }) {
  const { offset, limit } = pageWindow(query);
  return paged(rows.slice(offset, offset + limit), rows.length, query);
}

/**
 * Offset and limit for a page; defaults to the first 20 rows. Use these values for SQL `skip` and `take`,
 * so every module uses the same defaults.
 *
 * @param query `limit` and `offset` from the query string.
 * @returns `{ offset, limit }`
 */
export function pageWindow(query: { limit?: number; offset?: number }) {
  return { offset: query.offset ?? 0, limit: query.limit ?? 20 };
}

/**
 * Repository-standard paginated response: `{ items, total, offset, limit }`.
 *
 * @param items Rows in the current page.
 * @param total Total number of matching rows.
 * @param query `limit` and `offset` from the query string.
 * @returns `{ items, total, offset, limit }`
 */
export function paged<T>(
  items: T[],
  total: number,
  query: { limit?: number; offset?: number },
) {
  return { items, total, ...pageWindow(query) };
}
