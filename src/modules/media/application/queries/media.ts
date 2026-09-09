import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { MediaUseCases } from '../media';
export class MediaDownloadQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.MediaDownloadQueryInput,
  ) {}
}
@QueryHandler(MediaDownloadQuery)
export class MediaDownloadQueryHandler implements IQueryHandler<MediaDownloadQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: MediaUseCases,
  ) {}
  execute(message: MediaDownloadQuery) {
    return this.uow.read((s) =>
      this.useCases.download(s, message.actor, message.input),
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
    private readonly uow: UnitOfWork,
    private readonly useCases: MediaUseCases,
  ) {}
  execute(message: MediaGalleryQuery) {
    return this.uow.read((s) =>
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
    private readonly uow: UnitOfWork,
    private readonly useCases: MediaUseCases,
  ) {}
  execute(message: MediaGetQuery) {
    return this.uow.read((s) =>
      this.useCases.get(s, message.actor, message.input),
    );
  }
}
