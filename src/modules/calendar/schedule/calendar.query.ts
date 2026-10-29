import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { CalendarUseCases } from './calendar.use-case';

export class CalendarMeQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarMeQueryInput,
  ) {}
}
@QueryHandler(CalendarMeQuery)
export class CalendarMeQueryHandler implements IQueryHandler<CalendarMeQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CalendarUseCases,
  ) {}

  /**
   * Run the query for the current user’s calendar in a transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: CalendarMeQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.me(s, message.actor, message.input),
    );
  }
}

export class CalendarAvailabilityQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarAvailabilityQueryInput,
  ) {}
}
@QueryHandler(CalendarAvailabilityQuery)
export class CalendarAvailabilityQueryHandler implements IQueryHandler<CalendarAvailabilityQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CalendarUseCases,
  ) {}

  /**
   * Run the query for available photographer calendar time ranges.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: CalendarAvailabilityQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.availability(s, message.actor, message.input),
    );
  }
}

export class CalendarOfflineSlotsQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarOfflineSlotsQueryInput,
  ) {}
}
@QueryHandler(CalendarOfflineSlotsQuery)
export class CalendarOfflineSlotsQueryHandler implements IQueryHandler<CalendarOfflineSlotsQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CalendarUseCases,
  ) {}

  /**
   * Run the query for a photographer's future blocked time slots in a transaction.
   *
   * @param message Query message to execute.
   * @returns Future offline slots visible to customers.
   */
  execute(message: CalendarOfflineSlotsQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.futureOfflineSlots(s, message.actor, message.input),
    );
  }
}

export class CalendarBlockPreviewQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarBlockPreviewQueryInput,
  ) {}
}
@QueryHandler(CalendarBlockPreviewQuery)
export class CalendarBlockPreviewQueryHandler implements IQueryHandler<CalendarBlockPreviewQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CalendarUseCases,
  ) {}

  /**
   * Run the query that previews a blocked time range and the affected bookings.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: CalendarBlockPreviewQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.blockPreview(s, message.actor, message.input),
    );
  }
}
