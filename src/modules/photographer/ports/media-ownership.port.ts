import type { EntityManager } from 'typeorm';
import type { Actor } from '@shared/platform/auth/actor';

/** Kiểm media thuộc về người đang gọi và đã sẵn sàng để đưa vào portfolio. */
export abstract class MediaOwnershipPort {
  abstract owned(
    manager: EntityManager,
    actor: Actor,
    mediaId: string,
    ready?: boolean,
  ): Promise<{ id: string }>;
}
