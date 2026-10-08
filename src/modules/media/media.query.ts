import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { MediaUseCases } from './media.use-case';

export class MediaDownloadQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.MediaDownloadQueryInput,
  ) {}
}

@QueryHandler(MediaDownloadQuery)
export class MediaDownloadQueryHandler implements IQueryHandler<MediaDownloadQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: MediaUseCases,
  ) {}

  /**
   * Run the media query in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: MediaDownloadQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.downloadGallery(s, message.actor, message.input),
    );
  }
}

export class MediaGalleryQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.MediaGalleryQueryInput,
  ) {}
}
@QueryHandler(MediaGalleryQuery)
export class MediaGalleryQueryHandler implements IQueryHandler<MediaGalleryQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: MediaUseCases,
  ) {}

  /**
   * Run the media gallery query in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: MediaGalleryQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.gallery(s, message.actor, message.input),
    );
  }
}

export class MediaGetQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.MediaGetQueryInput,
  ) {}
}
@QueryHandler(MediaGetQuery)
export class MediaGetQueryHandler implements IQueryHandler<MediaGetQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: MediaUseCases,
  ) {}

  /**
   * Run the query to fetch media in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: MediaGetQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.get(s, message.actor, message.input),
    );
  }
}
