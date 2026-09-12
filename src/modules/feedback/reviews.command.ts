import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { ReviewUseCases } from './review.use-case';

export class ReviewCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ReviewCreateCommandInput,
  ) {}
}
@CommandHandler(ReviewCreateCommand)
export class ReviewCreateCommandHandler implements ICommandHandler<ReviewCreateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: ReviewUseCases,
  ) {}
  execute(message: ReviewCreateCommand) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: ReviewUseCases,
  ) {}
  execute(message: ReviewUpdateCommand) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: ReviewUseCases,
  ) {}
  execute(message: ReviewRemoveCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.remove(s, message.actor, message.input),
    );
  }
}
