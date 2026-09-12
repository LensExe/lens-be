import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { MediaUseCases } from './media.use-case';

export class MediaCompleteCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.MediaCompleteCommandInput,
  ) {}
}
@CommandHandler(MediaCompleteCommand)
export class MediaCompleteCommandHandler implements ICommandHandler<MediaCompleteCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: MediaUseCases,
  ) {}
  execute(message: MediaCompleteCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.complete(s, message.actor, message.input),
    );
  }
}

export class MediaUploadCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.MediaUploadCommandInput,
  ) {}
}
@CommandHandler(MediaUploadCommand)
export class MediaUploadCommandHandler implements ICommandHandler<MediaUploadCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: MediaUseCases,
  ) {}
  execute(message: MediaUploadCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.upload(s, message.actor, message.input),
    );
  }
}

export class MediaAddGalleryCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.MediaAddGalleryCommandInput,
  ) {}
}
@CommandHandler(MediaAddGalleryCommand)
export class MediaAddGalleryCommandHandler implements ICommandHandler<MediaAddGalleryCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: MediaUseCases,
  ) {}
  execute(message: MediaAddGalleryCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.addGallery(s, message.actor, message.input),
    );
  }
}

export class MediaPublishCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.MediaPublishCommandInput,
  ) {}
}
@CommandHandler(MediaPublishCommand)
export class MediaPublishCommandHandler implements ICommandHandler<MediaPublishCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: MediaUseCases,
  ) {}
  execute(message: MediaPublishCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.publish(s, message.actor, message.input),
    );
  }
}

export class MediaCreateGalleryCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.MediaCreateGalleryCommandInput,
  ) {}
}
@CommandHandler(MediaCreateGalleryCommand)
export class MediaCreateGalleryCommandHandler implements ICommandHandler<MediaCreateGalleryCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: MediaUseCases,
  ) {}
  execute(message: MediaCreateGalleryCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.createGallery(s, message.actor, message.input),
    );
  }
}

export class MediaRemoveCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.MediaRemoveCommandInput,
  ) {}
}
@CommandHandler(MediaRemoveCommand)
export class MediaRemoveCommandHandler implements ICommandHandler<MediaRemoveCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: MediaUseCases,
  ) {}
  execute(message: MediaRemoveCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.remove(s, message.actor, message.input),
    );
  }
}
