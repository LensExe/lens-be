import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { BookingUseCases } from '../bookings';
export class BookingCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCreateCommandInput,
  ) {}
}
@CommandHandler(BookingCreateCommand)
export class BookingCreateCommandHandler implements ICommandHandler<BookingCreateCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCreateCommand) {
    return this.uow.write((s) =>
      this.useCases.create(s, message.actor, message.input),
    );
  }
}

export class BookingAcceptCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingAcceptCommandInput,
  ) {}
}
@CommandHandler(BookingAcceptCommand)
export class BookingAcceptCommandHandler implements ICommandHandler<BookingAcceptCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingAcceptCommand) {
    return this.uow.write((s) =>
      this.useCases.accept(s, message.actor, message.input),
    );
  }
}

export class BookingCancelCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCancelCommandInput,
  ) {}
}
@CommandHandler(BookingCancelCommand)
export class BookingCancelCommandHandler implements ICommandHandler<BookingCancelCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCancelCommand) {
    return this.uow.write((s) =>
      this.useCases.cancel(s, message.actor, message.input),
    );
  }
}

export class BookingCompleteCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCompleteCommandInput,
  ) {}
}
@CommandHandler(BookingCompleteCommand)
export class BookingCompleteCommandHandler implements ICommandHandler<BookingCompleteCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCompleteCommand) {
    return this.uow.write((s) =>
      this.useCases.complete(s, message.actor, message.input),
    );
  }
}

export class BookingCompleteShootCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCompleteShootCommandInput,
  ) {}
}
@CommandHandler(BookingCompleteShootCommand)
export class BookingCompleteShootCommandHandler implements ICommandHandler<BookingCompleteShootCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCompleteShootCommand) {
    return this.uow.write((s) =>
      this.useCases.completeShoot(s, message.actor, message.input),
    );
  }
}

export class BookingDisputeCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingDisputeCommandInput,
  ) {}
}
@CommandHandler(BookingDisputeCommand)
export class BookingDisputeCommandHandler implements ICommandHandler<BookingDisputeCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingDisputeCommand) {
    return this.uow.write((s) =>
      this.useCases.dispute(s, message.actor, message.input),
    );
  }
}

export class BookingRejectCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingRejectCommandInput,
  ) {}
}
@CommandHandler(BookingRejectCommand)
export class BookingRejectCommandHandler implements ICommandHandler<BookingRejectCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingRejectCommand) {
    return this.uow.write((s) =>
      this.useCases.reject(s, message.actor, message.input),
    );
  }
}

export class BookingStartCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingStartCommandInput,
  ) {}
}
@CommandHandler(BookingStartCommand)
export class BookingStartCommandHandler implements ICommandHandler<BookingStartCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingStartCommand) {
    return this.uow.write((s) =>
      this.useCases.start(s, message.actor, message.input),
    );
  }
}
