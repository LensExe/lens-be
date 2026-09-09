import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { ReviewUseCases } from '../reviews';
export class ReviewSummaryQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ReviewSummaryQueryInput,
  ) {}
}
@QueryHandler(ReviewSummaryQuery)
export class ReviewSummaryQueryHandler implements IQueryHandler<ReviewSummaryQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: ReviewUseCases,
  ) {}
  execute(message: ReviewSummaryQuery) {
    return this.uow.read((s) =>
      this.useCases.summary(s, message.actor, message.input),
    );
  }
}

export class ReviewListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ReviewListQueryInput,
  ) {}
}
@QueryHandler(ReviewListQuery)
export class ReviewListQueryHandler implements IQueryHandler<ReviewListQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: ReviewUseCases,
  ) {}
  execute(message: ReviewListQuery) {
    return this.uow.read((s) =>
      this.useCases.list(s, message.actor, message.input),
    );
  }
}
