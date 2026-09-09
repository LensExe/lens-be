import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { CalendarUseCases } from '../calendar';
export class CalendarCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarCreateCommandInput,
  ) {}
}
@CommandHandler(CalendarCreateCommand)
export class CalendarCreateCommandHandler implements ICommandHandler<CalendarCreateCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: CalendarUseCases,
  ) {}
  execute(message: CalendarCreateCommand) {
    return this.uow.write((s) =>
      this.useCases.create(s, message.actor, message.input),
    );
  }
}

export class CalendarBlockCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarBlockCommandInput,
  ) {}
}
@CommandHandler(CalendarBlockCommand)
export class CalendarBlockCommandHandler implements ICommandHandler<CalendarBlockCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: CalendarUseCases,
  ) {}
  execute(message: CalendarBlockCommand) {
    return this.uow.write((s) =>
      this.useCases.block(s, message.actor, message.input),
    );
  }
}

export class CalendarUpdateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarUpdateCommandInput,
  ) {}
}
@CommandHandler(CalendarUpdateCommand)
export class CalendarUpdateCommandHandler implements ICommandHandler<CalendarUpdateCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: CalendarUseCases,
  ) {}
  execute(message: CalendarUpdateCommand) {
    return this.uow.write((s) =>
      this.useCases.update(s, message.actor, message.input),
    );
  }
}

export class CalendarRemoveCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarRemoveCommandInput,
  ) {}
}
@CommandHandler(CalendarRemoveCommand)
export class CalendarRemoveCommandHandler implements ICommandHandler<CalendarRemoveCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: CalendarUseCases,
  ) {}
  execute(message: CalendarRemoveCommand) {
    return this.uow.write((s) =>
      this.useCases.remove(s, message.actor, message.input),
    );
  }
}

export class CalendarUnblockCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarUnblockCommandInput,
  ) {}
}
@CommandHandler(CalendarUnblockCommand)
export class CalendarUnblockCommandHandler implements ICommandHandler<CalendarUnblockCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: CalendarUseCases,
  ) {}
  execute(message: CalendarUnblockCommand) {
    return this.uow.write((s) =>
      this.useCases.unblock(s, message.actor, message.input),
    );
  }
}
