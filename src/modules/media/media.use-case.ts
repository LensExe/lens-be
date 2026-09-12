import type { EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity, MediaStatus } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ObjectStorage } from '@shared/integrations/s3/storage.port';
import type { Actor } from '@shared/platform/auth/actor';
import {
  currentUser,
  required,
  bookingAccess,
  emit,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Media } from './media.domain';
import type { MediaOwnershipPort } from '@modules/photographer/ports/media-ownership.port';

@Injectable()
export class MediaUseCases implements MediaOwnershipPort {
  constructor(private readonly storage: ObjectStorage) {}

  async upload(s: EntityManager, a: Actor, i: Inputs.MediaUploadCommandInput) {
    const u = await currentUser(s, a),
      key = `${u.id}/${randomUUID()}`;
    const upload_url = await this.storage.uploadUrl(
      key,
      i.content_type,
      i.file_size,
    );
    const media = await s.save(EntitySchemas.media, {
      ...i,
      user_id: u.id,
      file_key: key,
    });
    return { media, upload_url, expires_in: 900 };
  }

  async owned(s: EntityManager, a: Actor, id: string, ready = true) {
    const u = await currentUser(s, a),
      m = await required(s, 'media', id);
    ensure(m.user_id === u.id, 'Media access denied', 'forbidden');
    Media.assertNotDeleted(m.status);
    if (ready) Media.assertReady(m.status);
    return m;
  }

  async complete(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaCompleteCommandInput,
  ) {
    const m = await this.owned(s, a, i.media_id, false);
    await this.storage.verify(m.file_key, m.content_type, Number(m.file_size));
    return updateEntity(s, EntitySchemas.media, m.id, {
      status: MediaStatus.READY,
    });
  }

  async get(s: EntityManager, a: Actor, i: Inputs.MediaGetQueryInput) {
    const u = await currentUser(s, a),
      m = await required(s, 'media', i.id);
    ensure(m.status === MediaStatus.READY, 'Media not found', 'missing');
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
    return {
      id: m.id,
      content_type: m.content_type,
      file_size: m.file_size,
      download_url: await this.storage.downloadUrl(m.file_key),
      expires_in: 900,
    };
  }

  async remove(s: EntityManager, a: Actor, i: Inputs.MediaRemoveCommandInput) {
    const m = await this.owned(s, a, i.id, false);
    ensure(
      !(await s.find(EntitySchemas.booking_deliveries)).some((delivery) =>
        delivery.media_ids.includes(m.id),
      ) &&
        !(await s.find(EntitySchemas.portfolios)).some((portfolio) =>
          portfolio.items.includes(m.id),
        ) &&
        !(await s.findBy(EntitySchemas.portfolios, { cover_media_id: m.id }))
          .length,
      'Media is still referenced',
      'conflict',
    );
    await this.storage.delete(m.file_key);
    await updateEntity(s, EntitySchemas.media, m.id, {
      status: MediaStatus.DELETED,
    });
    return { deleted: true };
  }

  async createGallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaCreateGalleryCommandInput,
  ) {
    await bookingAccess(s, a, i.id, 'photographer');
    const [existing] = await s.findBy(EntitySchemas.booking_deliveries, {
      booking_id: i.id,
    });
    return (
      existing ??
      s.save(EntitySchemas.booking_deliveries, {
        booking_id: i.id,
        media_ids: [],
      })
    );
  }

  async addGallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaAddGalleryCommandInput,
  ) {
    const { booking: b } = await bookingAccess(s, a, i.id, 'photographer');
    Media.assertGalleryMutable(b.gallery_published_at);
    const [delivery] = await s.findBy(EntitySchemas.booking_deliveries, {
      booking_id: i.id,
    });
    ensure(delivery, 'Create gallery first', 'conflict');
    const m = await this.owned(s, a, i.media_id);
    ensure(
      !delivery.media_ids.includes(m.id),
      'Media already added to gallery',
    );
    return updateEntity(s, EntitySchemas.booking_deliveries, delivery.id, {
      media_ids: [...delivery.media_ids, m.id],
    });
  }

  async gallery(s: EntityManager, a: Actor, i: Inputs.MediaGalleryQueryInput) {
    const {
      booking: b,
      user,
      photographer: p,
    } = await bookingAccess(s, a, i.id);
    ensure(
      user.id === p.user_id || !!b.gallery_published_at,
      'Gallery not published',
      'forbidden',
    );
    const [delivery] = await s.findBy(EntitySchemas.booking_deliveries, {
      booking_id: i.id,
    });
    ensure(delivery, 'Gallery not found', 'missing');
    const items = [] as any[];
    for (const mediaId of delivery.media_ids) {
      const media = await required(s, 'media', mediaId);
      items.push({
        id: media.id,
        media_id: media.id,
        file_size: media.file_size,
        download_url: await this.storage.downloadUrl(media.file_key),
      });
    }
    return {
      ...delivery,
      published_at: b.gallery_published_at,
      items,
      expires_in: 900,
    };
  }

  async publish(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaPublishCommandInput,
  ) {
    const { booking: b, recipients } = await bookingAccess(
      s,
      a,
      i.id,
      'photographer',
    );
    Media.assertBookingReadyForPublish(b.status);
    Media.assertGalleryNotEmpty(
      (await s.findBy(EntitySchemas.booking_deliveries, { booking_id: i.id }))
        .length,
    );
    if (!b.gallery_published_at) {
      await updateEntity(s, EntitySchemas.bookings, b.id, {
        gallery_published_at: new Date().toISOString(),
      });
      await emit(s, 'gallery.ready', recipients, { booking_id: b.id });
    }
    return this.gallery(s, a, i);
  }

  async download(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaDownloadQueryInput,
  ) {
    await bookingAccess(s, a, i.id, 'customer');
    return this.gallery(s, a, i);
  }
}
