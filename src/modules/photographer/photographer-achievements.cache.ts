import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@shared/database/redis/redis.service';

export interface PhotographerAchievementSnapshot {
  rank: {
    code: string;
    name: string;
    commission_percent: number;
  };
  badges: Array<{
    code: string;
    name: string;
    earned_at: string;
  }>;
}

export interface PhotographerAchievementCacheInput {
  photographer_id: string;
  completed_bookings: number;
}

export interface PhotographerAchievementCacheWrite {
  input: PhotographerAchievementCacheInput;
  snapshot: PhotographerAchievementSnapshot;
}

/** Shared Redis cache for the rank and earned-badge projection shown on photographer profiles. */
@Injectable()
export class PhotographerAchievementsCache {
  private static readonly VERSION_KEY = 'photographer:achievements:version';
  private static readonly KEY_PREFIX = 'photographer:achievements:v1';
  private static readonly TTL_SECONDS = 300;

  private readonly logger = new Logger(PhotographerAchievementsCache.name);

  constructor(private readonly redis: RedisService) {}

  /** Read achievement projections in a batch. Missing or unavailable cache entries are returned as misses. */
  async getMany(inputs: readonly PhotographerAchievementCacheInput[]): Promise<{
    version: string;
    values: Map<string, PhotographerAchievementSnapshot>;
  }> {
    let version = '0';
    if (inputs.length === 0) return { version, values: new Map() };

    try {
      version =
        (await this.redis.get(PhotographerAchievementsCache.VERSION_KEY)) ??
        '0';
      const rawValues = await this.redis
        .getClient()
        .mGet(inputs.map((input) => this.key(version, input)));
      const values = new Map<string, PhotographerAchievementSnapshot>();

      inputs.forEach((input, index) => {
        const raw = rawValues[index];
        if (!raw) return;
        try {
          const value = JSON.parse(raw) as PhotographerAchievementSnapshot;
          if (this.isSnapshot(value)) values.set(input.photographer_id, value);
        } catch {
          // Treat malformed cache content as a miss and repair it from the database.
        }
      });

      return { version, values };
    } catch (error) {
      this.logger.warn(
        `Achievement cache read failed: ${this.errorMessage(error)}`,
      );
      return { version, values: new Map() };
    }
  }

  /** Cache database-derived projections. Redis errors do not fail the profile query. */
  async setMany(
    version: string,
    writes: readonly PhotographerAchievementCacheWrite[],
  ): Promise<void> {
    if (writes.length === 0) return;
    try {
      await Promise.all(
        writes.map(({ input, snapshot }) =>
          this.redis.setJson(
            this.key(version, input),
            snapshot,
            PhotographerAchievementsCache.TTL_SECONDS,
          ),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `Achievement cache write failed: ${this.errorMessage(error)}`,
      );
    }
  }

  /** Bump the namespace version after a catalog edit or newly awarded badge. */
  async invalidateAll(): Promise<void> {
    try {
      await this.redis
        .getClient()
        .incr(PhotographerAchievementsCache.VERSION_KEY);
    } catch (error) {
      this.logger.warn(
        `Achievement cache invalidation failed: ${this.errorMessage(error)}`,
      );
    }
  }

  private key(
    version: string,
    input: PhotographerAchievementCacheInput,
  ): string {
    return `${PhotographerAchievementsCache.KEY_PREFIX}:${version}:${input.photographer_id}:${input.completed_bookings}`;
  }

  private isSnapshot(value: unknown): value is PhotographerAchievementSnapshot {
    if (!value || typeof value !== 'object') return false;
    const snapshot = value as Partial<PhotographerAchievementSnapshot>;
    return (
      !!snapshot.rank &&
      typeof snapshot.rank.code === 'string' &&
      typeof snapshot.rank.name === 'string' &&
      typeof snapshot.rank.commission_percent === 'number' &&
      Array.isArray(snapshot.badges) &&
      snapshot.badges.every(
        (badge) =>
          !!badge &&
          typeof badge.code === 'string' &&
          typeof badge.name === 'string' &&
          typeof badge.earned_at === 'string',
      )
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
