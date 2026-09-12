import type { EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import { Injectable } from '@nestjs/common';
import { photographer, required } from '@shared/common/access';
import { ObjectStorage } from '@shared/integrations/s3/storage.port';
import type { Actor } from '@shared/platform/auth/actor';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type * as Inputs from '@shared/contracts/contracts';
import { MediaOwnershipPort } from './ports/media-ownership.port';
import { Portfolio } from './portfolio.domain';

@Injectable()
export class PortfolioUseCases {
  constructor(
    private readonly media: MediaOwnershipPort,
    private readonly storage: ObjectStorage,
  ) {}

  async own(s: EntityManager, a: Actor, id: string) {
    const p = await photographer(s, a),
      album = await required(s, 'portfolios', id);
    ensure(
      album.photographer_id === p.id,
      'Portfolio access denied',
      'forbidden',
    );
    return album;
  }

  async create(
    s: EntityManager,
    a: Actor,
    i: Inputs.PortfolioCreateCommandInput,
  ) {
    const p = await photographer(s, a);
    if (i.cover_media_id) await this.media.owned(s, a, i.cover_media_id);
    return s.save(EntitySchemas.portfolios, { ...i, photographer_id: p.id });
  }

  async list(s: EntityManager, _a: Actor, i: Inputs.PortfolioListQueryInput) {
    const p = await required(s, 'photographers', i.id),
      u = await required(s, 'users', p.user_id);
    ensure(u.status === 'active', 'Photographer not found', 'missing');
    return {
      items: await s.findBy(EntitySchemas.portfolios, {
        photographer_id: i.id,
      }),
    };
  }

  async get(s: EntityManager, _a: Actor, i: Inputs.PortfolioGetQueryInput) {
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
    for (const [position, mediaId] of album.items.entries()) {
      const m = await required(s, 'media', mediaId);
      items.push({
        id: mediaId,
        portfolio_id: album.id,
        media_id: mediaId,
        position,
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

  async update(
    s: EntityManager,
    a: Actor,
    i: Inputs.PortfolioUpdateCommandInput,
  ) {
    const { id, ...fields } = i;
    await this.own(s, a, id);
    if (fields.cover_media_id)
      await this.media.owned(s, a, fields.cover_media_id);
    return updateEntity(s, EntitySchemas.portfolios, id, fields);
  }

  async remove(
    s: EntityManager,
    a: Actor,
    i: Inputs.PortfolioRemoveCommandInput,
  ) {
    await this.own(s, a, i.id);
    await s.delete(EntitySchemas.portfolios, i.id);
    return { deleted: true };
  }

  async add(s: EntityManager, a: Actor, i: Inputs.PortfolioAddCommandInput) {
    const album = await this.own(s, a, i.id);
    const m = await this.media.owned(s, a, i.media_id);
    await updateEntity(s, EntitySchemas.portfolios, album.id, {
      items: Portfolio.add(album.items, m.id),
    });
    return {
      id: m.id,
      portfolio_id: album.id,
      media_id: m.id,
      position: album.items.length,
    };
  }

  async removeItem(
    s: EntityManager,
    a: Actor,
    i: Inputs.PortfolioRemoveItemCommandInput,
  ) {
    const album = await this.own(s, a, i.id);
    await updateEntity(s, EntitySchemas.portfolios, album.id, {
      items: Portfolio.remove(album.items, i.itemId),
    });
    return { deleted: true };
  }

  async reorder(
    s: EntityManager,
    a: Actor,
    i: Inputs.PortfolioReorderCommandInput,
  ) {
    const album = await this.own(s, a, i.id);
    await updateEntity(s, EntitySchemas.portfolios, album.id, {
      items: Portfolio.reorder(album.items, i.item_ids),
    });
    return this.get(s, a, i);
  }
}
