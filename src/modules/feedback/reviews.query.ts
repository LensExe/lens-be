import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { ReviewUseCases } from './review.use-case';

export class ReviewSummaryQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ReviewSummaryQueryInput,
  ) {}
}
@QueryHandler(ReviewSummaryQuery)
export class ReviewSummaryQueryHandler implements IQueryHandler<ReviewSummaryQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: ReviewUseCases,
  ) {}
  execute(message: ReviewSummaryQuery) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: ReviewUseCases,
  ) {}
  execute(message: ReviewListQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.list(s, message.actor, message.input),
    );
  }
}
