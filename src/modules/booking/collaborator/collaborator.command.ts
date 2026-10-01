import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { BookingUseCases } from '../core/booking.use-case';

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

  /**
   * Route the booking collaborator invitation command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
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

  /**
   * Route the booking collaboration acceptance command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
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

  /**
   * Route the booking collaboration rejection command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
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

  /**
   * Route the booking collaboration revocation command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: BookingCollaboratorRevokeCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.revokeCollaboration(s, message.actor, message.input),
    );
  }
}
