import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { BookingUseCases } from './booking.use-case';
export class BookingCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCreateCommandInput,
  ) {}
}
@CommandHandler(BookingCreateCommand)
export class BookingCreateCommandHandler implements ICommandHandler<BookingCreateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCreateCommand) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingAcceptCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.accept(s, message.actor, message.input),
    );
  }
}

export class BookingAdminCancelCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingAdminCancelCommandInput,
  ) {}
}
@CommandHandler(BookingAdminCancelCommand)
export class BookingAdminCancelCommandHandler implements ICommandHandler<BookingAdminCancelCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingAdminCancelCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.adminCancel(s, message.actor, message.input),
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
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCancelCommand) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCompleteCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.complete(s, message.actor, message.input),
    );
  }
}

export class BookingCancelUnpaidCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCancelUnpaidCommandInput,
  ) {}
}
@CommandHandler(BookingCancelUnpaidCommand)
export class BookingCancelUnpaidCommandHandler implements ICommandHandler<BookingCancelUnpaidCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCancelUnpaidCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.cancelUnpaid(s, message.actor),
    );
  }
}

export class BookingExpirePendingCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingExpirePendingCommandInput,
  ) {}
}
@CommandHandler(BookingExpirePendingCommand)
export class BookingExpirePendingCommandHandler implements ICommandHandler<BookingExpirePendingCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingExpirePendingCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.expirePending(s, message.actor),
    );
  }
}

export class BookingAutoCompleteCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingAutoCompleteCommandInput,
  ) {}
}
@CommandHandler(BookingAutoCompleteCommand)
export class BookingAutoCompleteCommandHandler implements ICommandHandler<BookingAutoCompleteCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingAutoCompleteCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.autoComplete(s, message.actor),
    );
  }
}

export class BookingConfirmReceiptCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingConfirmReceiptCommandInput,
  ) {}
}
@CommandHandler(BookingConfirmReceiptCommand)
export class BookingConfirmReceiptCommandHandler implements ICommandHandler<BookingConfirmReceiptCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingConfirmReceiptCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.confirmReceipt(s, message.actor, message.input),
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
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCompleteShootCommand) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingDisputeCommand) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingRejectCommand) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingStartCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.start(s, message.actor, message.input),
    );
  }
}

export class BookingCollaboratorInviteCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCollaboratorInviteCommandInput,
  ) {}
}
@CommandHandler(BookingCollaboratorInviteCommand)
export class BookingCollaboratorInviteCommandHandler implements ICommandHandler<BookingCollaboratorInviteCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCollaboratorInviteCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.inviteCollaborator(s, message.actor, message.input),
    );
  }
}

export class BookingCollaboratorAcceptCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCollaboratorAcceptCommandInput,
  ) {}
}
@CommandHandler(BookingCollaboratorAcceptCommand)
export class BookingCollaboratorAcceptCommandHandler implements ICommandHandler<BookingCollaboratorAcceptCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCollaboratorAcceptCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.acceptCollaboration(s, message.actor, message.input),
    );
  }
}

export class BookingCollaboratorDeclineCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCollaboratorDeclineCommandInput,
  ) {}
}
@CommandHandler(BookingCollaboratorDeclineCommand)
export class BookingCollaboratorDeclineCommandHandler implements ICommandHandler<BookingCollaboratorDeclineCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCollaboratorDeclineCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.declineCollaboration(s, message.actor, message.input),
    );
  }
}

export class BookingCollaboratorRevokeCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCollaboratorRevokeCommandInput,
  ) {}
}
@CommandHandler(BookingCollaboratorRevokeCommand)
export class BookingCollaboratorRevokeCommandHandler implements ICommandHandler<BookingCollaboratorRevokeCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingCollaboratorRevokeCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.revokeCollaboration(s, message.actor, message.input),
    );
  }
}
