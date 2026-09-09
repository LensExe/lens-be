import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { BookingUseCases } from '../bookings';
export class BookingAdminQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingAdminQueryInput,
  ) {}
}
@QueryHandler(BookingAdminQuery)
export class BookingAdminQueryHandler implements IQueryHandler<BookingAdminQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingAdminQuery) {
    return this.uow.read((s) =>
      this.useCases.admin(s, message.actor, message.input),
    );
  }
}

export class BookingListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingListQueryInput,
  ) {}
}
@QueryHandler(BookingListQuery)
export class BookingListQueryHandler implements IQueryHandler<BookingListQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingListQuery) {
    return this.uow.read((s) =>
      this.useCases.list(s, message.actor, message.input),
    );
  }
}

export class BookingTimelineQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingTimelineQueryInput,
  ) {}
}
@QueryHandler(BookingTimelineQuery)
export class BookingTimelineQueryHandler implements IQueryHandler<BookingTimelineQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingTimelineQuery) {
    return this.uow.read((s) =>
      this.useCases.timeline(s, message.actor, message.input),
    );
  }
}

export class BookingGetQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingGetQueryInput,
  ) {}
}
@QueryHandler(BookingGetQuery)
export class BookingGetQueryHandler implements IQueryHandler<BookingGetQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: BookingUseCases,
  ) {}
  execute(message: BookingGetQuery) {
    return this.uow.read((s) =>
      this.useCases.get(s, message.actor, message.input),
    );
  }
}
