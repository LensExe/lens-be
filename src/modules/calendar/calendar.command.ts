import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { CalendarUseCases } from './calendar.use-case';

export class CalendarBlockCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarBlockCommandInput,
  ) {}
}
@CommandHandler(CalendarBlockCommand)
export class CalendarBlockCommandHandler implements ICommandHandler<CalendarBlockCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CalendarUseCases,
  ) {}
  execute(message: CalendarBlockCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.block(s, message.actor, message.input),
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
    private readonly dataSource: DataSource,
    private readonly useCases: CalendarUseCases,
  ) {}
  execute(message: CalendarUnblockCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.unblock(s, message.actor, message.input),
    );
  }
}
