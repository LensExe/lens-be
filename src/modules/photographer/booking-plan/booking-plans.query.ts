import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { BookingPlanUseCases } from './booking-plan.use-case';

export class BookingPlanMeQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingPlanMeQueryInput,
  ) {}
}
@QueryHandler(BookingPlanMeQuery)
export class BookingPlanMeQueryHandler implements IQueryHandler<BookingPlanMeQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingPlanUseCases,
  ) {}
  execute(message: BookingPlanMeQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.me(s, message.actor),
    );
  }
}

export class BookingPlanListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingPlanListQueryInput,
  ) {}
}
@QueryHandler(BookingPlanListQuery)
export class BookingPlanListQueryHandler implements IQueryHandler<BookingPlanListQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingPlanUseCases,
  ) {}
  execute(message: BookingPlanListQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.list(s, message.actor, message.input),
    );
  }
}
