import type { EntityManager } from 'typeorm';
import type {
  MediaStatus,
  MediaVisibility,
} from '@shared/domain/values/media.values';

/** Media details and time-limited URLs an admin may use to review report evidence. */
export interface ModerationEvidenceMedia {
  id: string;
  status: MediaStatus;
  content_type: string;
  file_size: number;
  visibility: MediaVisibility;
  thumbnail_url: string | null;
  preview_url: string | null;
  download_url: string | null;
  expires_in: number | null;
}

/** Media capability consumed by Moderation after the report access check succeeds. */
export abstract class ReportEvidenceMediaPort {
  abstract forModeration(
    manager: EntityManager,
    mediaIds: readonly string[],
  ): Promise<ModerationEvidenceMedia[]>;
}
