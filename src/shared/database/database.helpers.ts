import {
  LessThan,
  MoreThan,
  type EntityManager,
  type EntityTarget,
  type ObjectLiteral,
  type DeepPartial,
} from 'typeorm';
import { DomainError } from '../platform/exceptions/domain.error';

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
 * Điều kiện `where` tìm mục của thợ (booking, khoảng chặn) chồng lên khoảng nửa mở `[from, to)`.
 * Mốc nào không gửi thì không lọc phía đó. Dùng chung cho booking và calendar.
 *
 * @param photographerId ID hồ sơ thợ
 * @param window `from` / `to` ISO, đều tuỳ chọn
 * @returns Điều kiện `where` cho `find` / `findBy`
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
