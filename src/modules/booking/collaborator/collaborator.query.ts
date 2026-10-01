import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { BookingUseCases } from '../core/booking.use-case';

export class BookingCollaboratorListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCollaboratorListQueryInput,
  ) {}
}

@QueryHandler(BookingCollaboratorListQuery)
export class BookingCollaboratorListQueryHandler implements IQueryHandler<BookingCollaboratorListQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}

  /**
   * Run the query for booking collaborators by user and invitation status.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: BookingCollaboratorListQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.collaborators(s, message.actor, message.input),
    );
  }
}

export class BookingCollaboratorMeQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingCollaboratorMeQueryInput,
  ) {}
}

@QueryHandler(BookingCollaboratorMeQuery)
export class BookingCollaboratorMeQueryHandler implements IQueryHandler<BookingCollaboratorMeQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingUseCases,
  ) {}

  /**
   * Run the query for booking collaborators by user and invitation status.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: BookingCollaboratorMeQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.myCollaborations(s, message.actor, message.input),
    );
  }
}
