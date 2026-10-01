import { In, type EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import { Injectable } from '@nestjs/common';
import {
  photographer,
  publicPhotographer,
  required,
} from '@shared/common/access';
import { ObjectStorage } from '@shared/integrations/s3/storage.port';
import type { Actor } from '@shared/platform/auth/actor';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type * as Inputs from '@shared/contracts/contracts';
import { MediaOwnershipPort } from '../ports/media-ownership.port';
import { Portfolio } from './portfolio.domain';

@Injectable()
export class PortfolioUseCases {
  constructor(
    private readonly media: MediaOwnershipPort,
    private readonly storage: ObjectStorage,
  ) {}

  /**
   * The signed-in photographer's portfolio; lock its row so concurrent image edits do not overwrite each other.
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer making the API request.
   * @param id ID portfolio
   * @returns Portfolio; throws HTTP 404 if it does not exist or HTTP 403 if it belongs to another photographer.
   * @throws {DomainError} Thrown when required data or a resource is missing or the actor is not authorized.
   */
  private async own(s: EntityManager, a: Actor, id: string) {
    const p = await photographer(s, a),
      album = await s.findOne(EntitySchemas.portfolios, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
    ensure(album, 'portfolios not found', 'missing');
    ensure(
      album.photographer_id === p.id,
      'Portfolio access denied',
      'forbidden',
    );
    return album;
  }

  /**
   * A photographer creates a portfolio (album); the cover image must belong to that photographer.
   *
   * @param s EntityManager for the current transaction.
   * @param a Photographer making the API request.
   * @param i Name, description, and cover image.
   * @returns Portfolio just created.
   */
  async create(
    s: EntityManager,
    a: Actor,
    i: Inputs.PortfolioCreateCommandInput,
  ) {
    const p = await photographer(s, a);
    if (i.cover_media_id) await this.media.owned(s, a, i.cover_media_id);
    return s.save(EntitySchemas.portfolios, { ...i, photographer_id: p.id });
  }

  /**
   * Customers view a photographer's public portfolio list, paginated in the database.
   *
   * @param s EntityManager for the current transaction.
   * @param _a Caller provided for interface compatibility; unused because this API is public.
   * @param i Photographer profile ID, `limit` (default 20), and `offset` (default 0).
   * @returns `{ items, total, offset, limit }`, oldest portfolios first; throws HTTP 404 if the photographer is not public.
   */
  async list(s: EntityManager, _a: Actor, i: Inputs.PortfolioListQueryInput) {
    await publicPhotographer(s, i.id);
    const offset = i.offset ?? 0,
      limit = i.limit ?? 20;
    const [items, total] = await s.findAndCount(EntitySchemas.portfolios, {
      where: { photographer_id: i.id },
      order: { created_at: 'ASC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return { items, total, offset, limit };
  }

  /**
   * View a public portfolio: ordered image list with time-limited download links.
   *
   * @param s EntityManager for the current transaction.
   * @param _a Caller provided for interface compatibility; unused because this API is public.
   * @param i ID portfolio
   * @returns Portfolio with `items`, `cover_url`, and `expires_in` (seconds); throws HTTP 404 if the photographer is not public.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  async get(s: EntityManager, _a: Actor, i: Inputs.PortfolioGetQueryInput) {
    const album = await required(s, 'portfolios', i.id);
    await publicPhotographer(s, album.photographer_id);
    const items = [] as {
      id: string;
      portfolio_id: string;
      media_id: string;
      position: number;
      download_url: string;
    }[];
    const media = new Map(
      (await s.findBy(EntitySchemas.media, { id: In([...album.items]) })).map(
        (m) => [m.id, m],
      ),
    );
    for (const [position, mediaId] of album.items.entries()) {
      const m = media.get(mediaId);
      ensure(m, 'media not found', 'missing');
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

  /**
   * A photographer edits portfolio details (name, description, and cover image).
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the API request; must own the portfolio.
   * @param i Portfolio ID and fields to update.
   * @returns Updated portfolio.
   */
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

  /**
   * A photographer deletes a portfolio.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the API request; must own the portfolio.
   * @param i ID portfolio
   * @returns `{ deleted: true }`
   */
  async remove(
    s: EntityManager,
    a: Actor,
    i: Inputs.PortfolioRemoveCommandInput,
  ) {
    await this.own(s, a, i.id);
    await s.delete(EntitySchemas.portfolios, i.id);
    return { deleted: true };
  }

  /**
   * A photographer adds one of their own media files to the end of a portfolio.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the API request; must own the portfolio.
   * @param i Portfolio ID and media ID.
   * @returns Item just added, including its position.
   */
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

  /**
   * A photographer removes an image from a portfolio.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the API request; must own the portfolio.
   * @param i Portfolio ID and image ID.
   * @returns `{ deleted: true }`
   */
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

  /**
   * A photographer reorders the images in a portfolio.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the API request; must own the portfolio.
   * @param i Portfolio ID and image IDs in the new order.
   * @returns Portfolio after reordering.
   */
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
