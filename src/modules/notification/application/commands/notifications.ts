import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { NotificationUseCases } from '../notifications';
export class NotificationCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.NotificationCreateCommandInput,
  ) {}
}
@CommandHandler(NotificationCreateCommand)
export class NotificationCreateCommandHandler implements ICommandHandler<NotificationCreateCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: NotificationUseCases,
  ) {}
  execute(message: NotificationCreateCommand) {
    return this.uow.write((s) =>
      this.useCases.create(s, message.actor, message.input),
    );
  }
}

export class NotificationReadAllCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.NotificationReadAllCommandInput,
  ) {}
}
@CommandHandler(NotificationReadAllCommand)
export class NotificationReadAllCommandHandler implements ICommandHandler<NotificationReadAllCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: NotificationUseCases,
  ) {}
  execute(message: NotificationReadAllCommand) {
    return this.uow.write((s) => this.useCases.readAll(s, message.actor));
  }
}

export class NotificationReadCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.NotificationReadCommandInput,
  ) {}
}
@CommandHandler(NotificationReadCommand)
export class NotificationReadCommandHandler implements ICommandHandler<NotificationReadCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: NotificationUseCases,
  ) {}
  execute(message: NotificationReadCommand) {
    return this.uow.write((s) =>
      this.useCases.read(s, message.actor, message.input),
    );
  }
}
