import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { ReviewUseCases } from '../reviews';
export class ReviewCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ReviewCreateCommandInput,
  ) {}
}
@CommandHandler(ReviewCreateCommand)
export class ReviewCreateCommandHandler implements ICommandHandler<ReviewCreateCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: ReviewUseCases,
  ) {}
  execute(message: ReviewCreateCommand) {
    return this.uow.write((s) =>
      this.useCases.create(s, message.actor, message.input),
    );
  }
}

export class ReviewUpdateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ReviewUpdateCommandInput,
  ) {}
}
@CommandHandler(ReviewUpdateCommand)
export class ReviewUpdateCommandHandler implements ICommandHandler<ReviewUpdateCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: ReviewUseCases,
  ) {}
  execute(message: ReviewUpdateCommand) {
    return this.uow.write((s) =>
      this.useCases.update(s, message.actor, message.input),
    );
  }
}

export class ReviewRemoveCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ReviewRemoveCommandInput,
  ) {}
}
@CommandHandler(ReviewRemoveCommand)
export class ReviewRemoveCommandHandler implements ICommandHandler<ReviewRemoveCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: ReviewUseCases,
  ) {}
  execute(message: ReviewRemoveCommand) {
    return this.uow.write((s) =>
      this.useCases.remove(s, message.actor, message.input),
    );
  }
}
