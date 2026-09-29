import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { BookingPlanUseCases } from './booking-plan.use-case';

export class BookingPlanCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingPlanCreateCommandInput,
  ) {}
}
@CommandHandler(BookingPlanCreateCommand)
export class BookingPlanCreateCommandHandler implements ICommandHandler<BookingPlanCreateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingPlanUseCases,
  ) {}
  execute(message: BookingPlanCreateCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.create(s, message.actor, message.input),
    );
  }
}

export class BookingPlanUpdateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingPlanUpdateCommandInput,
  ) {}
}
@CommandHandler(BookingPlanUpdateCommand)
export class BookingPlanUpdateCommandHandler implements ICommandHandler<BookingPlanUpdateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingPlanUseCases,
  ) {}
  execute(message: BookingPlanUpdateCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.update(s, message.actor, message.input),
    );
  }
}

export class BookingPlanRemoveCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingPlanRemoveCommandInput,
  ) {}
}
@CommandHandler(BookingPlanRemoveCommand)
export class BookingPlanRemoveCommandHandler implements ICommandHandler<BookingPlanRemoveCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingPlanUseCases,
  ) {}
  execute(message: BookingPlanRemoveCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.remove(s, message.actor, message.input),
    );
  }
}
