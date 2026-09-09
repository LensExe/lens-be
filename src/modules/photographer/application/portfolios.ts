import { Injectable } from '@nestjs/common';
import { photographer, required } from '@shared/common/access';
import {
  ObjectStorage,
  type Actor,
  type Session,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type * as Inputs from '@shared/contracts/contracts';
import { MediaUseCases } from '@modules/media/application/media';

@Injectable()
export class PortfolioUseCases {
  constructor(
    private readonly media: MediaUseCases,
    private readonly storage: ObjectStorage,
  ) {}
  async own(s: Session, a: Actor, id: string) {
    const p = await photographer(s, a),
      album = await required(s, 'portfolios', id);
    ensure(
      album.photographer_id === p.id,
      'Portfolio access denied',
      'forbidden',
    );
    return album;
  }
  async create(s: Session, a: Actor, i: Inputs.PortfolioCreateCommandInput) {
    const p = await photographer(s, a);
    if (i.cover_media_id) await this.media.owned(s, a, i.cover_media_id);
    return s.insert('portfolios', { ...i, photographer_id: p.id });
  }
  async list(s: Session, _a: Actor, i: Inputs.PortfolioListQueryInput) {
    const p = await required(s, 'photographers', i.id),
      u = await required(s, 'users', p.user_id);
    ensure(u.status === 'active', 'Photographer not found', 'missing');
    return { items: await s.find('portfolios', { photographer_id: i.id }) };
  }
  async get(s: Session, _a: Actor, i: { id: string }) {
    const album = await required(s, 'portfolios', i.id),
      p = await required(s, 'photographers', album.photographer_id),
      u = await required(s, 'users', p.user_id);
    ensure(u.status === 'active', 'Portfolio not found', 'missing');
    const items = [] as {
      id: string;
      portfolio_id: string;
      media_id: string;
      position: number;
      download_url: string;
    }[];
    for (const item of await s.find(
      'portfolio_items',
      { portfolio_id: album.id },
      { order: 'position' },
    )) {
      const m = await required(s, 'media', item.media_id);
      items.push({
        ...item,
        download_url: await this.storage.downloadUrl(m.file_key),
      });
    }
    const cover = album.cover_media_id
      ? await required(s, 'media', album.cover_media_id)
      : null;
    return {
      ...album,
      cover_url: cover ? await this.storage.downloadUrl(cover.file_key) : null,
      items,
      expires_in: 900,
    };
  }
  async update(s: Session, a: Actor, i: Inputs.PortfolioUpdateCommandInput) {
    const { id, ...fields } = i;
    await this.own(s, a, id);
    if (fields.cover_media_id)
      await this.media.owned(s, a, fields.cover_media_id);
    return s.update('portfolios', id, fields);
  }
  async remove(s: Session, a: Actor, i: { id: string }) {
    await this.own(s, a, i.id);
    await s.delete('portfolios', i.id);
    return { deleted: true };
  }
  async add(s: Session, a: Actor, i: { id: string; media_id: string }) {
    await this.own(s, a, i.id);
    const m = await this.media.owned(s, a, i.media_id);
    const items = await s.find('portfolio_items', { portfolio_id: i.id });
    return s.insert('portfolio_items', {
      portfolio_id: i.id,
      media_id: m.id,
      position: items.length
        ? Math.max(...items.map((x) => x.position)) + 1
        : 0,
    });
  }
  async removeItem(s: Session, a: Actor, i: { id: string; itemId: string }) {
    await this.own(s, a, i.id);
    const item = await required(s, 'portfolio_items', i.itemId);
    ensure(
      item.portfolio_id === i.id,
      'Item does not belong to portfolio',
      'forbidden',
    );
    await s.delete('portfolio_items', i.itemId);
    return { deleted: true };
  }
  async reorder(s: Session, a: Actor, i: { id: string; item_ids: string[] }) {
    await this.own(s, a, i.id);
    const items = await s.find('portfolio_items', { portfolio_id: i.id });
    ensure(
      new Set(i.item_ids).size === items.length &&
        i.item_ids.length === items.length &&
        items.every((x) => i.item_ids.includes(x.id)),
      'Provide every item ID exactly once',
    );
    for (const [position, id] of i.item_ids.entries())
      await s.update('portfolio_items', id, { position });
    return this.get(s, a, i);
  }
}
