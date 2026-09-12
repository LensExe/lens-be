import {
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
