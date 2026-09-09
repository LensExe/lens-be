import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { ModerationUseCases } from '../moderation';
export class ModerationCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ModerationCreateCommandInput,
  ) {}
}
@CommandHandler(ModerationCreateCommand)
export class ModerationCreateCommandHandler implements ICommandHandler<ModerationCreateCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: ModerationUseCases,
  ) {}
  execute(message: ModerationCreateCommand) {
    return this.uow.write((s) =>
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
    private readonly uow: UnitOfWork,
    private readonly useCases: ModerationUseCases,
  ) {}
  execute(message: ModerationResolveCommand) {
    return this.uow.write((s) =>
      this.useCases.resolve(s, message.actor, message.input),
    );
  }
}
