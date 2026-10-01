import {
  LessThan,
  MoreThan,
  type EntityManager,
  type EntityTarget,
  type ObjectLiteral,
  type DeepPartial,
} from 'typeorm';
import { DomainError } from '../platform/exceptions/domain.error';

/**
 * Load a record by ID, apply the supplied fields, and save the changes.
 *
 * @param manager EntityManager for the current transaction.
 * @param target Target object to process.
 * @param id ID of the record to process.
 * @param changes changes data of type DeepPartial<T>.
 * @returns Result returned by `save`.
 */
export async function updateEntity<T extends ObjectLiteral>(
  manager: EntityManager,
  target: EntityTarget<T>,
  id: string,
  changes: DeepPartial<T>,
): Promise<T> {
  const repository = manager.getRepository(target);
  const entity = await repository.preload({
    id,
    ...changes,
    updated_at: new Date().toISOString(),
  });
  if (!entity) throw new DomainError('missing', 'Resource not found');
  return repository.save(entity);
}

/**
 * `where` condition to find a photographer's item (booking or blocked interval) overlapping the half-open range `[from, to)`.
 * An omitted boundary leaves that side unfiltered. Shared by booking and calendar.
 *
 * @param photographerId Photographer profile ID.
 * @param window Optional ISO `from` and `to` values; either may be supplied independently.
 * @returns `where` condition for `find` or `findBy`.
 */
export function overlapWhere(
  photographerId: string,
  window: { from?: string; to?: string },
) {
  return {
    photographer_id: photographerId,
    ...(window.to !== undefined && {
      from: LessThan(new Date(window.to).toISOString()),
    }),
    ...(window.from !== undefined && {
      to: MoreThan(new Date(window.from).toISOString()),
    }),
  };
}
