import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { CalendarUseCases } from '../calendar';
export class CalendarMeQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CalendarMeQueryInput,
  ) {}
}
@QueryHandler(CalendarMeQuery)
export class CalendarMeQueryHandler implements IQueryHandler<CalendarMeQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: CalendarUseCases,
  ) {}
  execute(message: CalendarMeQuery) {
    return this.uow.read((s) => this.useCases.me(s, message.actor));
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
    private readonly uow: UnitOfWork,
    private readonly useCases: CalendarUseCases,
  ) {}
  execute(message: CalendarAvailabilityQuery) {
    return this.uow.read((s) =>
      this.useCases.availability(s, message.actor, message.input),
    );
  }
}
