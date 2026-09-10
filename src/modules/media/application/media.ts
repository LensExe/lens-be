import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ObjectStorage,
  type Actor,
  type Session,
} from '@shared/database/unit-of-work/unit-of-work.port';
import {
  currentUser,
  required,
  bookingAccess,
  emit,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Media } from '../domain/media';

@Injectable()
export class MediaUseCases {
  constructor(private readonly storage: ObjectStorage) {}
  async upload(
    s: Session,
    a: Actor,
    i: { content_type: string; file_size: number },
  ) {
    const u = await currentUser(s, a),
      key = `${u.id}/${randomUUID()}`;
    const upload_url = await this.storage.uploadUrl(
      key,
      i.content_type,
      i.file_size,
    );
    const media = await s.insert('media', {
      ...i,
      user_id: u.id,
      file_key: key,
    });
    return { media, upload_url, expires_in: 900 };
  }
  async owned(s: Session, a: Actor, id: string, ready = true) {
    const u = await currentUser(s, a),
      m = await required(s, 'media', id);
    ensure(m.user_id === u.id, 'Media access denied', 'forbidden');
    Media.assertNotDeleted(m.status);
    if (ready) Media.assertReady(m.status);
    return m;
  }
  async complete(s: Session, a: Actor, i: { media_id: string }) {
    const m = await this.owned(s, a, i.media_id, false);
    await this.storage.verify(m.file_key, m.content_type, Number(m.file_size));
    return s.update('media', m.id, { status: 'ready' });
  }
  async get(s: Session, a: Actor, i: { id: string }) {
    const u = await currentUser(s, a),
      m = await required(s, 'media', i.id);
    ensure(m.status === 'ready', 'Media not found', 'missing');
    let allowed = m.user_id === u.id;
    if (!allowed)
      for (const album of await s.find('portfolios', {
        cover_media_id: m.id,
      })) {
        const p = await required(s, 'photographers', album.photographer_id),
          owner = await required(s, 'users', p.user_id);
        if (owner.status === 'active') allowed = true;
      }
    if (!allowed)
      for (const item of await s.find('portfolio_items', { media_id: m.id })) {
        const portfolio = await required(s, 'portfolios', item.portfolio_id),
          p = await required(s, 'photographers', portfolio.photographer_id),
          owner = await required(s, 'users', p.user_id);
        if (owner.status === 'active') allowed = true;
      }
    if (!allowed)
      for (const item of await s.find('booking_deliveries', {
        media_id: m.id,
      })) {
        const b = await required(s, 'bookings', item.booking_id),
          c = await required(s, 'customers', b.customer_id),
          p = await required(s, 'photographers', b.photographer_id);
        if (
          p.user_id === u.id ||
          (c.user_id === u.id && !!b.gallery_published_at)
        )
          allowed = true;
      }
    if (!allowed)
      for (const msg of await s.find('messages', { media_id: m.id })) {
        const c = await required(s, 'conversations', msg.conversation_id);
        if ([c.customer_user_id, c.photographer_user_id].includes(u.id))
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
  async remove(s: Session, a: Actor, i: { id: string }) {
    const m = await this.owned(s, a, i.id, false);
    ensure(
      !(await s.find('booking_deliveries', { media_id: m.id })).length &&
        !(await s.find('portfolio_items', { media_id: m.id })).length &&
        !(await s.find('portfolios', { cover_media_id: m.id })).length &&
        !(await s.find('messages', { media_id: m.id })).length,
      'Media is still referenced',
      'conflict',
    );
    await this.storage.delete(m.file_key);
    await s.update('media', m.id, { status: 'deleted' });
    return { deleted: true };
  }
  async createGallery(s: Session, a: Actor, i: { id: string }) {
    await bookingAccess(s, a, i.id, 'photographer');
    const [existing] = await s.find('galleries', { booking_id: i.id });
    return existing ?? s.insert('galleries', { booking_id: i.id });
  }
  async addGallery(s: Session, a: Actor, i: { id: string; media_id: string }) {
    const { booking: b } = await bookingAccess(s, a, i.id, 'photographer');
    Media.assertGalleryMutable(b.gallery_published_at);
    const [g] = await s.find('galleries', { booking_id: i.id });
    ensure(g, 'Create gallery first', 'conflict');
    const m = await this.owned(s, a, i.media_id);
    return s.insert('booking_deliveries', {
      booking_id: i.id,
      media_id: m.id,
      file_key: m.file_key,
      file_size: m.file_size,
    });
  }
  async gallery(s: Session, a: Actor, i: { id: string }) {
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
    const [g] = await s.find('galleries', { booking_id: i.id });
    ensure(g, 'Gallery not found', 'missing');
    const items = [] as any[];
    for (const d of await s.find('booking_deliveries', { booking_id: i.id }))
      items.push({
        id: d.id,
        media_id: d.media_id,
        file_size: d.file_size,
        download_url: await this.storage.downloadUrl(d.file_key),
      });
    return {
      ...g,
      published_at: b.gallery_published_at,
      items,
      expires_in: 900,
    };
  }
  async publish(s: Session, a: Actor, i: { id: string }) {
    const { booking: b, recipients } = await bookingAccess(
      s,
      a,
      i.id,
      'photographer',
    );
    Media.assertBookingReadyForPublish(b.status);
    Media.assertGalleryNotEmpty(
      (await s.find('booking_deliveries', { booking_id: i.id })).length,
    );
    if (!b.gallery_published_at) {
      await s.update('bookings', b.id, {
        gallery_published_at: new Date().toISOString(),
      });
      await emit(s, 'gallery.ready', recipients, { booking_id: b.id });
    }
    return this.gallery(s, a, i);
  }
  async download(s: Session, a: Actor, i: { id: string }) {
    await bookingAccess(s, a, i.id, 'customer');
    return this.gallery(s, a, i);
  }
}
