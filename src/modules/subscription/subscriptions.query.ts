import { Logger } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { RedisService } from '@shared/database/redis/redis.service';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { SubscriptionUseCases } from './subscription.use-case';

export class SubscriptionUsageQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionUsageQueryInput,
  ) {}
}
@QueryHandler(SubscriptionUsageQuery)
export class SubscriptionUsageQueryHandler implements IQueryHandler<SubscriptionUsageQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /**
   * Run the current subscription usage query.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: SubscriptionUsageQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.usage(s, message.actor),
    );
  }
}

export class SubscriptionMeQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionMeQueryInput,
  ) {}
}
@QueryHandler(SubscriptionMeQuery)
export class SubscriptionMeQueryHandler implements IQueryHandler<SubscriptionMeQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /**
   * Run the query for the current user’s subscription.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: SubscriptionMeQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.me(s, message.actor),
    );
  }
}

export class SubscriptionPlansQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionPlansQueryInput,
  ) {}
}
@QueryHandler(SubscriptionPlansQuery)
export class SubscriptionPlansQueryHandler implements IQueryHandler<SubscriptionPlansQuery> {
  private static readonly CACHE_KEY = 'catalog:subscription-plans:v1';
  private static readonly CACHE_TTL_SECONDS = 3600;

  private readonly logger = new Logger(SubscriptionPlansQueryHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
    private readonly redis: RedisService,
  ) {}

  /**
   * Run the subscription plan list query in the current transaction.
   *
   * @returns Result of the operation performed in the transaction.
   */
  async execute() {
    try {
      const cached = await this.redis.getJson<
        Awaited<ReturnType<SubscriptionUseCases['plans']>>
      >(SubscriptionPlansQueryHandler.CACHE_KEY);
      if (cached) return cached;
    } catch (error) {
      this.logger.warn(
        `Subscription plan cache read failed: ${this.errorMessage(error)}`,
      );
    }

    const result = await this.dataSource.transaction((s) =>
      this.useCases.plans(s),
    );
    try {
      await this.redis.setJson(
        SubscriptionPlansQueryHandler.CACHE_KEY,
        result,
        SubscriptionPlansQueryHandler.CACHE_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(
        `Subscription plan cache write failed: ${this.errorMessage(error)}`,
      );
    }
    return result;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

export class SubscriptionHistoryQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionHistoryQueryInput,
  ) {}
}

@QueryHandler(SubscriptionHistoryQuery)
export class SubscriptionHistoryQueryHandler implements IQueryHandler<SubscriptionHistoryQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: SubscriptionUseCases,
  ) {}

  /** Run the current photographer's subscription timeline query. */
  execute(message: SubscriptionHistoryQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.history(s, message.actor),
    );
  }
}
