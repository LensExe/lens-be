import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { ModerationUseCases } from './moderation.use-case';

export class ModerationCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ModerationCreateCommandInput,
  ) {}
}
@CommandHandler(ModerationCreateCommand)
export class ModerationCreateCommandHandler implements ICommandHandler<ModerationCreateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: ModerationUseCases,
  ) {}
  execute(message: ModerationCreateCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.create(s, message.actor, message.input),
    );
  }
}

export class ModerationResolveCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ModerationResolveCommandInput,
  ) {}
}
@CommandHandler(ModerationResolveCommand)
export class ModerationResolveCommandHandler implements ICommandHandler<ModerationResolveCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: ModerationUseCases,
  ) {}
  execute(message: ModerationResolveCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.resolve(s, message.actor, message.input),
    );
  }
}
