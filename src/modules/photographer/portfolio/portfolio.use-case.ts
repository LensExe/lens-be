import { In, type EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import { Injectable } from '@nestjs/common';
import {
  currentUser,
  photographer,
  publicPhotographer,
  required,
  role,
} from '@shared/common/access';
import { ObjectStorage } from '@shared/integrations/s3/storage.port';
import { MediaVariantType } from '@shared/database/entities/media-variant.entity';
import type { Actor } from '@shared/platform/auth/actor';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type * as Inputs from '@shared/contracts/contracts';
import { MediaOwnershipPort } from '../ports/media-ownership.port';
import { Portfolio } from './portfolio.domain';
import type { PortfolioEntity } from '@shared/database/entities/portfolio.entity';
import { SubscriptionPortfolioQuotaPort } from '../ports/subscription-portfolio-quota.port';
import { PublicPortfolioMetadataCache } from './public-portfolio-metadata.cache';

interface PortfolioMetadata {
  albums: PortfolioEntity[];
  media: Array<{ id: string; file_key: string }>;
  previews: Array<{ media_id: string; file_key: string }>;
}

@Injectable()
export class PortfolioUseCases {
  constructor(
    private readonly media: MediaOwnershipPort,
    private readonly storage: ObjectStorage,
    private readonly publicPortfolioCache?: PublicPortfolioMetadataCache,
    private readonly subscriptionQuota?: SubscriptionPortfolioQuotaPort,
  ) {}

  /** Load only durable portfolio and media metadata, without signing object-storage URLs. */
  private async loadMetadata(
    s: EntityManager,
    albums: readonly PortfolioEntity[],
  ): Promise<PortfolioMetadata> {
    const mediaIds = [
      ...new Set(
        albums.flatMap((album) => [
          ...album.items,
          ...(album.cover_media_id ? [album.cover_media_id] : []),
        ]),
      ),
    ];
    const [mediaRows, previewRows] = mediaIds.length
      ? await Promise.all([
          s.findBy(EntitySchemas.media, { id: In(mediaIds) }),
          s.find(EntitySchemas.media_variants, {
            where: {
              media_id: In(mediaIds),
              variant: MediaVariantType.PREVIEW,
            },
          }),
        ])
      : [[], []];
    return {
      albums: [...albums],
      media: mediaRows.map(({ id, file_key }) => ({ id, file_key })),
      previews: previewRows.map(({ media_id, file_key }) => ({
        media_id,
        file_key,
      })),
    };
  }

  /** Sign fresh image URLs from cached or freshly loaded metadata for each response. */
  private async withDetails(metadata: PortfolioMetadata) {
    const media = new Map(
      metadata.media.map((item) => [item.id, item] as const),
    );
    const previews = new Map(
      metadata.previews.map((preview) => [preview.media_id, preview] as const),
    );

    return Promise.all(
      metadata.albums.map(async (album) => {
        const items = await Promise.all(
          album.items.map(async (mediaId, position) => {
            const item = media.get(mediaId);
            ensure(item, 'media not found', 'missing');
            return {
              id: mediaId,
              portfolio_id: album.id,
              media_id: mediaId,
              position,
              preview_url: await this.storage.downloadUrl(
                previews.get(mediaId)?.file_key ?? item.file_key,
              ),
              download_url: await this.storage.downloadUrl(item.file_key),
            };
          }),
        );
        const cover = album.cover_media_id
          ? media.get(album.cover_media_id)
          : null;
        if (album.cover_media_id) ensure(cover, 'media not found', 'missing');
        const coverPreview = cover ? previews.get(cover.id) : undefined;
        return {
          ...album,
          cover_url: cover
            ? await this.storage.downloadUrl(
                coverPreview?.file_key ?? cover.file_key,
              )
            : null,
          items,
          expires_in: 900,
        };
      }),
    );
  }

  private getPublicMetadata<T>(
    view: 'list' | 'detail',
    input: unknown,
    load: () => Promise<T>,
  ): Promise<T> {
    return this.publicPortfolioCache
      ? this.publicPortfolioCache.getOrLoad(view, input, load)
      : load();
  }

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
    await s.findOne(EntitySchemas.photographers, {
      where: { id: p.id },
      lock: { mode: 'pessimistic_write' },
    });
    const subscriptionQuota = this.subscriptionQuota;
    ensure(
      subscriptionQuota,
      'Subscription portfolio quota is unavailable',
      'unavailable',
    );
    await subscriptionQuota.assertPortfolioCreationAllowed(s, p.id);
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
    await publicPhotographer(s, i.photographer_id);
    const offset = i.offset ?? 0,
      limit = i.limit ?? 20;
    const page = await this.getPublicMetadata(
      'list',
      { photographer_id: i.photographer_id, limit, offset },
      async () => {
        const [albums, total] = await s.findAndCount(EntitySchemas.portfolios, {
          where: { photographer_id: i.photographer_id },
          order: { created_at: 'ASC', id: 'ASC' },
          skip: offset,
          take: limit,
        });
        return { ...(await this.loadMetadata(s, albums)), total };
      },
    );
    return {
      items: await this.withDetails(page),
      total: page.total,
      offset,
      limit,
    };
  }

  /** Admin review of albums from pending, rejected, or public profiles. */
  async listAdmin(
    s: EntityManager,
    a: Actor,
    i: Inputs.PortfolioListQueryInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    await required(s, 'photographers', i.photographer_id);
    const offset = i.offset ?? 0;
    const limit = i.limit ?? 20;
    const [albums, total] = await s.findAndCount(EntitySchemas.portfolios, {
      where: { photographer_id: i.photographer_id },
      order: { created_at: 'ASC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return {
      items: await this.withDetails(await this.loadMetadata(s, albums)),
      total,
      offset,
      limit,
    };
  }

  /** List all portfolios owned by the authenticated photographer, including non-public profiles. */
  async listMine(
    s: EntityManager,
    a: Actor,
    i: Inputs.PortfolioMyListQueryInput,
  ) {
    const p = await photographer(s, a);
    const offset = i.offset ?? 0;
    const limit = i.limit ?? 20;
    const [items, total] = await s.findAndCount(EntitySchemas.portfolios, {
      where: { photographer_id: p.id },
      order: { created_at: 'ASC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return {
      items: await this.withDetails(await this.loadMetadata(s, items)),
      total,
      offset,
      limit,
    };
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
    const metadata = await this.getPublicMetadata(
      'detail',
      { portfolio_id: i.portfolio_id },
      async () => {
        const album = await required(s, 'portfolios', i.portfolio_id);
        await publicPhotographer(s, album.photographer_id);
        return this.loadMetadata(s, [album]);
      },
    );
    const album = metadata.albums[0];
    ensure(album, 'portfolios not found', 'missing');
    await publicPhotographer(s, album.photographer_id);
    return (await this.withDetails(metadata))[0];
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
    const { portfolio_id, ...fields } = i;
    await this.own(s, a, portfolio_id);
    if (fields.cover_media_id)
      await this.media.owned(s, a, fields.cover_media_id);
    return updateEntity(s, EntitySchemas.portfolios, portfolio_id, fields);
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
    await this.own(s, a, i.portfolio_id);
    await s.delete(EntitySchemas.portfolios, i.portfolio_id);
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
    const album = await this.own(s, a, i.portfolio_id);
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
    const album = await this.own(s, a, i.portfolio_id);
    await updateEntity(s, EntitySchemas.portfolios, album.id, {
      items: Portfolio.remove(album.items, i.portfolio_item_id),
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
    const album = await this.own(s, a, i.portfolio_id);
    await updateEntity(s, EntitySchemas.portfolios, album.id, {
      items: Portfolio.reorder(album.items, i.portfolio_item_ids),
    });
    return this.get(s, a, i);
  }
}
