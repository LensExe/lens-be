import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import type { SubscriptionStorageUsagePort } from '@modules/subscription/ports/subscription-storage-usage.port';

/** Query the media context's storage usage without depending on Subscription. */
@Injectable()
export class MediaStorageUsageService implements SubscriptionStorageUsagePort {
  async usage(manager: EntityManager, userId: string) {
    const now = new Date().toISOString();
    const totals = await manager
      .createQueryBuilder(EntitySchemas.media, 'media')
      .select(
        "COALESCE(SUM(CASE WHEN media.status <> 'deleted' AND media.status <> 'pending' THEN media.file_size ELSE 0 END), 0)",
        'storage_bytes',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN media.status = 'pending' AND media.upload_expires_at > :now THEN media.file_size ELSE 0 END), 0)",
        'reserved_storage_bytes',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN media.status <> 'deleted' AND (media.status <> 'pending' OR media.upload_expires_at > :now) THEN media.file_size ELSE 0 END), 0)",
        'total_bytes',
      )
      .where('media.user_id = :userId', { userId })
      .setParameter('now', now)
      .getRawOne<{
        storage_bytes: string;
        reserved_storage_bytes: string;
        total_bytes: string;
      }>();
    const storage_bytes = Number(totals?.storage_bytes ?? 0);
    const reserved_storage_bytes = Number(totals?.reserved_storage_bytes ?? 0);
    return {
      storage_bytes,
      reserved_storage_bytes,
      total_bytes: Number(totals?.total_bytes ?? 0),
    };
  }
}
