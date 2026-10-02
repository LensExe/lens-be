import {
  In,
  LessThanOrEqual,
  type DataSource,
  type EntityManager,
} from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import {
  MediaStatus,
  MediaVisibility,
} from '@shared/domain/values/media.values';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ObjectStorage } from '@shared/integrations/s3/storage.port';
import {
  MediaVariantType,
  type MediaVariantEntity,
} from '@shared/database/entities/media-variant.entity';
import type { Actor } from '@shared/platform/auth/actor';
import {
  currentUser,
  required,
  bookingAccess,
  emit,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Media } from './media.domain';
import type { MediaOwnershipPort } from '@modules/photographer/ports/media-ownership.port';
import type {
  ModerationEvidenceMedia,
  ReportEvidenceMediaPort,
} from '@modules/moderation/ports/report-evidence-media.port';
import { SubscriptionStorageQuotaPort } from './ports/subscription-storage-quota.port';
import { MediaStorageUsageService } from './media-storage-usage.service';

@Injectable()
export class MediaUseCases
  implements MediaOwnershipPort, ReportEvidenceMediaPort
{
  constructor(
    private readonly storage: ObjectStorage,
    private readonly subscriptionQuota: SubscriptionStorageQuotaPort,
    private readonly storageUsage: MediaStorageUsageService,
  ) {}

  /**
   * Initialize an upload for new media.
   * - Validate the MIME type and file size against domain rules.
   * - Determine the visibility (PUBLIC or PRIVATE) and generate the storage file_key: `{visibility}/{user_id}/{uuid}`.
   * - Generate a presigned upload URL from Object Storage so the client or frontend can upload the file directly to S3 or MinIO.
   * - Save the initial media record to the database with a pending status.
   * - Return the media details, `upload_url`, and the URL's actual TTL.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @returns Result object containing the fields `media`, `upload_url`, `expires_in`.
   */
  async upload(s: EntityManager, a: Actor, i: Inputs.MediaUploadCommandInput) {
    // Validate Content-Type.
    Media.assertAllowedContentType(i.content_type);
    // Validate file size.
    Media.assertFileSize(i.file_size);
    const u = await currentUser(s, a);
    // Serialize reservations per user so concurrent presigned uploads cannot bypass the quota.
    await s.findOne(EntitySchemas.users, {
      where: { id: u.id },
      lock: { mode: 'pessimistic_write' },
    });
    const existing = await this.storageUsage.usage(s, u.id);
    await this.subscriptionQuota.assertUploadAllowed(
      s,
      u.id,
      existing.total_bytes,
      Number(i.file_size),
    );
    const visibility = i.visibility ?? MediaVisibility.PRIVATE,
      key = `${visibility}/${u.id}/${randomUUID()}`;
    // Create the presigned upload URL.
    const { url: upload_url, expiresIn: expires_in } =
      await this.storage.uploadUrl(key, i.content_type, i.file_size);
    const media = await s.save(EntitySchemas.media, {
      ...i,
      visibility,
      user_id: u.id,
      file_key: key,
      upload_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    });
    return { media, upload_url, expires_in };
  }

  /**
   * Validate that the media belongs to the current user and is valid for their use.
   * - Confirm that the current user created the media (`media.user_id === user.id`).
   * - Ensure the media has not been deleted (its status is not `DELETED`).
   * - When `ready = true` (the default), require the media to have `READY` status.
   * - Return the media entity if all conditions are met.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param id ID of the record to process.
   * @param ready Value used by the operation: ready.
   * @returns Processed m value.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  async owned(s: EntityManager, a: Actor, id: string, ready = true) {
    const u = await currentUser(s, a),
      m = await required(s, 'media', id);
    ensure(m.user_id === u.id, 'Media access denied', 'forbidden');
    Media.assertNotDeleted(m.status);
    if (ready) Media.assertReady(m.status);
    return m;
  }

  /**
   * Confirm that the upload completed after the client successfully uploaded the file to S3.
   * - Verify that the media belongs to the user.
   * - If the media is already `READY`, return it immediately (idempotent behavior).
   * - Ask storage to verify that the file exists in S3 (HeadObject) and has the expected Content-Type and size.
   * - Verify the object and transition the media to `UPLOADED` only.
   * - The worker processes the thumbnail and preview after this transaction commits.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @returns Result returned by `updateEntity`.
   */
  async complete(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaCompleteCommandInput,
  ) {
    const u = await currentUser(s, a);
    const m = await s.findOne(EntitySchemas.media, {
      where: { id: i.media_id },
      lock: { mode: 'pessimistic_write' },
    });
    ensure(m, 'media not found', 'missing');
    ensure(m.user_id === u.id, 'Media access denied', 'forbidden');
    Media.assertNotDeleted(m.status);
    if (m.status === MediaStatus.READY || m.status === MediaStatus.UPLOADED)
      return m;
    ensure(
      m.upload_expires_at !== null &&
        Date.parse(m.upload_expires_at) > Date.now(),
      'Media upload reservation expired; start a new upload',
      'conflict',
    );
    // verify file on s3
    await this.storage.verify(m.file_key, m.content_type, Number(m.file_size));
    return updateEntity(s, EntitySchemas.media, m.id, {
      status: MediaStatus.UPLOADED,
      upload_expires_at: null,
    });
  }

  /** Delete abandoned objects and release expired pending-upload quota reservations. */
  async expirePendingUploads(
    dataSource: DataSource,
    a: Actor,
    now = Date.now(),
  ) {
    role(a, 'system');
    const nowIso = new Date(now).toISOString();
    const due = await dataSource.manager.find(EntitySchemas.media, {
      where: {
        status: MediaStatus.PENDING,
        upload_expires_at: LessThanOrEqual(nowIso),
      },
      order: { upload_expires_at: 'ASC', id: 'ASC' },
      take: 100,
    });
    let processed = 0;
    for (const candidate of due) {
      const expired = await dataSource.transaction(async (manager) => {
        const media = await manager.findOne(EntitySchemas.media, {
          where: { id: candidate.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          !media ||
          media.status !== MediaStatus.PENDING ||
          !media.upload_expires_at ||
          Date.parse(media.upload_expires_at) > now
        )
          return false;
        await this.storage.deleteMany([media.file_key]);
        await updateEntity(manager, EntitySchemas.media, media.id, {
          status: MediaStatus.DELETED,
          upload_expires_at: null,
        });
        return true;
      });
      if (expired) processed++;
    }
    return { processed };
  }

  /**
   * Get media details along with its URLs (thumbnail, preview, and download).
   * - Check access control at multiple levels:
   * 1. The requester owns the file.
   * 2. Or the file is used as a cover image or portfolio item for an active photographer.
   * 3. Or the file belongs to a booking delivery gallery that has been published and the user is its photographer or customer.
   * - Query the `THUMBNAIL` and `PREVIEW` image variants.
   * - Generate the corresponding URL for each variant (a public URL or a 15-minute presigned URL for private media).
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @returns Result object containing the fields `id`, `status`, `content_type`, `file_size`, `visibility`.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  async get(s: EntityManager, a: Actor, i: Inputs.MediaGetQueryInput) {
    const u = await currentUser(s, a),
      m = await required(s, 'media', i.media_id);
    Media.assertNotDeleted(m.status);
    let allowed = m.user_id === u.id;
    if (!allowed)
      for (const album of await s.findBy(EntitySchemas.portfolios, {
        cover_media_id: m.id,
      })) {
        const p = await required(s, 'photographers', album.photographer_id),
          owner = await required(s, 'users', p.user_id);
        if (owner.status === 'active') allowed = true;
      }
    if (!allowed)
      for (const portfolio of await s.find(EntitySchemas.portfolios)) {
        if (!portfolio.items.includes(m.id)) continue;
        const p = await required(s, 'photographers', portfolio.photographer_id),
          owner = await required(s, 'users', p.user_id);
        if (owner.status === 'active') allowed = true;
      }
    if (!allowed)
      for (const delivery of await s.find(EntitySchemas.booking_deliveries)) {
        if (!delivery.media_ids.includes(m.id)) continue;
        const b = await required(s, 'bookings', delivery.booking_id),
          c = await required(s, 'customers', b.customer_id),
          p = await required(s, 'photographers', b.photographer_id);
        if (
          p.user_id === u.id ||
          (c.user_id === u.id && !!b.gallery_published_at)
        )
          allowed = true;
      }
    ensure(allowed, 'Media access denied', 'forbidden');
    if (m.status !== MediaStatus.READY) {
      return {
        id: m.id,
        status: m.status,
        content_type: m.content_type,
        file_size: m.file_size,
        visibility: m.visibility,
        thumbnail_url: null,
        preview_url: null,
        download_url: null,
        expires_in: null,
      };
    }
    const thumbnail = await this.findVariant(
      s,
      m.id,
      MediaVariantType.THUMBNAIL,
    );
    const preview = await this.findVariant(s, m.id, MediaVariantType.PREVIEW);
    return {
      id: m.id,
      content_type: m.content_type,
      file_size: m.file_size,
      visibility: m.visibility,
      thumbnail_url: await this.storage.getUrl(
        thumbnail?.file_key ?? m.file_key,
        m.visibility,
      ),
      preview_url: await this.storage.getUrl(
        preview?.file_key ?? m.file_key,
        m.visibility,
      ),
      download_url: await this.storage.getUrl(m.file_key, m.visibility),
      expires_in: m.visibility === MediaVisibility.PRIVATE ? 900 : null,
    };
  }

  /**
   * Return view/download URLs for evidence already attached to a report.
   * Moderation performs the admin authorization and only passes attached media IDs.
   */
  async forModeration(
    s: EntityManager,
    mediaIds: readonly string[],
  ): Promise<ModerationEvidenceMedia[]> {
    if (!mediaIds.length) return [];
    const uniqueIds = [...new Set(mediaIds)];
    const media = await s.find(EntitySchemas.media, {
      where: { id: In(uniqueIds) },
    });
    const variants = await s.find(EntitySchemas.media_variants, {
      where: { media_id: In(uniqueIds) },
    });
    const variantOf = new Map(
      variants.map((variant) => [
        `${variant.media_id}:${variant.variant}`,
        variant,
      ]),
    );
    const mediaOf = new Map(media.map((item) => [item.id, item]));

    const result: ModerationEvidenceMedia[] = [];
    for (const mediaId of mediaIds) {
      const item = mediaOf.get(mediaId);
      if (!item) continue;
      if (item.status !== MediaStatus.READY) {
        result.push({
          id: item.id,
          status: item.status,
          content_type: item.content_type,
          file_size: item.file_size,
          visibility: item.visibility,
          thumbnail_url: null,
          preview_url: null,
          download_url: null,
          expires_in: null,
        });
        continue;
      }

      const thumbnail = variantOf.get(
        `${item.id}:${MediaVariantType.THUMBNAIL}`,
      );
      const preview = variantOf.get(`${item.id}:${MediaVariantType.PREVIEW}`);
      const [thumbnailUrl, previewUrl, downloadUrl] = await Promise.all([
        this.storage.getUrl(
          thumbnail?.file_key ?? item.file_key,
          item.visibility,
        ),
        this.storage.getUrl(
          preview?.file_key ?? item.file_key,
          item.visibility,
        ),
        this.storage.getUrl(item.file_key, item.visibility),
      ]);
      result.push({
        id: item.id,
        status: item.status,
        content_type: item.content_type,
        file_size: item.file_size,
        visibility: item.visibility,
        thumbnail_url: thumbnailUrl,
        preview_url: previewUrl,
        download_url: downloadUrl,
        expires_in: item.visibility === MediaVisibility.PRIVATE ? 900 : null,
      });
    }
    return result;
  }

  /**
   * Delete a media file and clean up its related resources.
   * - Verify that the user owns the media.
   * - Check data constraints: the media must not be used in a booking delivery, portfolio, or report evidence.
   * - Delete all image variants (thumbnail, preview, etc.) and the original file from S3 storage.
   * - Delete the variant records from the `media_variants` table.
   * - Set the media status to `DELETED` (soft delete).
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @returns Result object containing the fields `deleted`.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async remove(s: EntityManager, a: Actor, i: Inputs.MediaRemoveCommandInput) {
    const m = await this.owned(s, a, i.media_id, false);
    ensure(
      !(await s.find(EntitySchemas.booking_deliveries)).some((delivery) =>
        delivery.media_ids.includes(m.id),
      ) &&
        !(await s.find(EntitySchemas.portfolios)).some((portfolio) =>
          portfolio.items.includes(m.id),
        ) &&
        !(await s.findBy(EntitySchemas.portfolios, { cover_media_id: m.id }))
          .length &&
        !(await s.countBy(EntitySchemas.report_evidences, { media_id: m.id })),
      'Media is still referenced',
      'conflict',
    );
    // get variants by media_id
    const variants = await s.findBy(EntitySchemas.media_variants, {
      media_id: m.id,
    });
    await this.storage.deleteMany([
      m.file_key,
      ...variants.map((variant) => variant.file_key),
    ]);
    await s.delete(EntitySchemas.media_variants, { media_id: m.id });
    await updateEntity(s, EntitySchemas.media, m.id, {
      status: MediaStatus.DELETED,
      upload_expires_at: null,
    });
    return { deleted: true };
  }

  /**
   * Initialize a delivery gallery for a booking.
   * - Validate authorization: the caller must be the photographer assigned to this booking.
   * - If the delivery already exists, return it; otherwise, create a `booking_deliveries` record with an empty image list (`media_ids: []`).
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @returns Result of the operation described above.
   */
  async createGallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaCreateGalleryCommandInput,
  ) {
    await bookingAccess(s, a, i.booking_id, 'photographer');
    const [existing] = await s.findBy(EntitySchemas.booking_deliveries, {
      booking_id: i.booking_id,
    });
    return (
      existing ??
      s.save(EntitySchemas.booking_deliveries, {
        booking_id: i.booking_id,
        media_ids: [],
      })
    );
  }

  /**
   * Add an uploaded image to a booking's delivery gallery.
   * - Verify that the photographer is authorized and the gallery has not been published (`gallery_published_at` is not set).
   * - Ensure the gallery has already been initialized.
   * - Ensure the photographer owns the image and it is not already in the gallery.
   * - Add `media_id` to the `media_ids` array in `booking_deliveries`.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @returns Result returned by `updateEntity`.
   * @throws {DomainError} Thrown when input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  async addToGallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaAddGalleryCommandInput,
  ) {
    // Verify the caller is the booking's photographer.
    const { booking: b } = await bookingAccess(
      s,
      a,
      i.booking_id,
      'photographer',
    );
    // Ensure the gallery has not been published.
    Media.assertGalleryMutable(b.gallery_published_at);
    // Load the booking delivery.
    const [delivery] = await s.findBy(EntitySchemas.booking_deliveries, {
      booking_id: i.booking_id,
    });
    ensure(delivery, 'Create gallery first', 'conflict');
    // Ensure the photographer owns the image.
    const m = await this.owned(s, a, i.media_id);
    // Ensure the image is not already in the gallery.
    ensure(
      !delivery.media_ids.includes(m.id),
      'Media already added to gallery',
    );
    return updateEntity(s, EntitySchemas.booking_deliveries, delivery.id, {
      media_ids: [...delivery.media_ids, m.id],
    });
  }

  /**
   * Get the list of images in a booking's gallery.
   * - Verify viewing access: only the booking's photographer or its customer (after the gallery is published) may view it.
   * - Support two display modes (`mode`):
   * - `'thumbnail'`: Return thumbnail URLs and dimensions (width/height) for smooth image grids in the web or app.
   * - `'original'`: Return URLs for downloading the high-resolution originals.
   * - Set the expiration time (`expires_in`) automatically when the gallery contains private images.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @param mode Value used by the operation: mode.
   * @returns Result object containing the fields `published_at`, `items`, `expires_in`.
   * @throws {DomainError} Thrown when the actor is not authorized or required data or a resource is missing.
   */
  async gallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaGalleryQueryInput,
    mode: 'thumbnail' | 'original' = 'thumbnail',
  ) {
    const {
      booking: b,
      user,
      photographer: p,
    } = await bookingAccess(s, a, i.booking_id);
    ensure(
      user.id === p.user_id || !!b.gallery_published_at,
      'Gallery not published',
      'forbidden',
    );

    const [delivery] = await s.findBy(EntitySchemas.booking_deliveries, {
      booking_id: i.booking_id,
    });
    ensure(delivery, 'Gallery not found', 'missing');

    const items = [] as Record<string, unknown>[];
    let hasPrivateMedia = false;
    for (const mediaId of delivery.media_ids) {
      const media = await required(s, 'media', mediaId);
      if (media.visibility !== MediaVisibility.PUBLIC) {
        hasPrivateMedia = true;
      }
      const item: Record<string, unknown> = {
        id: media.id,
        media_id: media.id,
        file_size: media.file_size,
        content_type: media.content_type,
      };
      if (mode === 'original') {
        item.download_url = await this.storage.getUrl(
          media.file_key,
          media.visibility,
        );
      } else {
        const thumbnail = await this.findVariant(
          s,
          media.id,
          MediaVariantType.THUMBNAIL,
        );
        item.thumbnail_url = await this.storage.getUrl(
          thumbnail?.file_key ?? media.file_key,
          media.visibility,
        );
        item.width = thumbnail?.width ?? null;
        item.height = thumbnail?.height ?? null;
      }
      items.push(item);
    }
    return {
      ...delivery,
      published_at: b.gallery_published_at,
      items,
      expires_in: hasPrivateMedia ? 900 : null,
    };
  }

  /**
   * Publish the image gallery for a booking's customer.
   * - Verify authorization: the caller must be the photographer assigned to the booking.
   * - Check that the booking is in a status that allows image delivery.
   * - Ensure the gallery contains at least one image before publishing.
   * - Update the booking's `gallery_published_at` timestamp.
   * - Emit the `'gallery.ready'` event so the system can notify the customer.
   * - Return the published gallery data.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @returns Result returned by `gallery`.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  async publishGallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaPublishCommandInput,
  ) {
    const { booking: b, recipients } = await bookingAccess(
      s,
      a,
      i.booking_id,
      'photographer',
    );
    Media.assertBookingReadyForPublish(b.status);
    const [delivery] = await s.findBy(EntitySchemas.booking_deliveries, {
      booking_id: i.booking_id,
    });
    ensure(delivery, 'Gallery not found', 'missing');
    Media.assertGalleryNotEmpty(delivery.media_ids.length);
    if (!b.gallery_published_at) {
      await updateEntity(s, EntitySchemas.bookings, b.id, {
        gallery_published_at: new Date().toISOString(),
      });
      await emit(s, 'gallery.ready', recipients, { booking_id: b.id });
    }
    return this.gallery(s, a, { booking_id: i.booking_id });
  }

  /**
   * Download all original images in a booking's gallery as the customer or photographer.
   * `bookingAccess` still verifies that the caller belongs to the booking.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor performing the operation; used for role and access checks.
   * @param i Input data for the operation.
   * @returns Result returned by `gallery`.
   */
  async downloadGallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaDownloadQueryInput,
  ) {
    await bookingAccess(s, a, i.booking_id);
    return this.gallery(s, a, { booking_id: i.booking_id }, 'original');
  }

  /**
   * Find an image variant (THUMBNAIL, PREVIEW, etc.) by `mediaId` and variant type in the `media_variants` table.
   *
   * @param s EntityManager for the current transaction.
   * @param mediaId Media ID to process.
   * @param variant variant data of type MediaVariantType.
   * @returns Result returned by `findOneBy`.
   */
  private findVariant(
    s: EntityManager,
    mediaId: string,
    variant: MediaVariantType,
  ): Promise<MediaVariantEntity | null> {
    return s.findOneBy(EntitySchemas.media_variants, {
      media_id: mediaId,
      variant,
    });
  }
}
