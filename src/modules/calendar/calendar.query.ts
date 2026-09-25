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
  execute(message: CalendarMeQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.me(s, message.actor),
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
  execute(message: CalendarAvailabilityQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.availability(s, message.actor, message.input),
    );
  }
}

export class CalendarWorkingHoursQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarWorkingHoursQueryInput,
  ) {}
}
@QueryHandler(CalendarWorkingHoursQuery)
export class CalendarWorkingHoursQueryHandler implements IQueryHandler<CalendarWorkingHoursQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CalendarUseCases,
  ) {}
  execute(message: CalendarWorkingHoursQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.workingHours(s, message.actor),
    );
  }
}
