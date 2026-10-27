import { Injectable, Logger } from '@nestjs/common';
import type { BookingPlanEntity } from '@shared/database/entities/booking-plan.entity';
import { RedisService } from '@shared/database/redis/redis.service';

/** Cache for the public, active booking plans owned by one photographer. */
@Injectable()
export class PublicBookingPlansCache {
  private static readonly KEY_PREFIX = 'photographer:booking-plans:public:v1';
  private static readonly TTL_SECONDS = 300;

  private readonly logger = new Logger(PublicBookingPlansCache.name);

  constructor(private readonly redis: RedisService) {}

  /** Read active plan lists for many photographers in one Redis request. */
  async getMany(
    photographerIds: readonly string[],
  ): Promise<Map<string, BookingPlanEntity[]>> {
    const values = new Map<string, BookingPlanEntity[]>();
    if (photographerIds.length === 0) return values;

    try {
      const keys = photographerIds.map((id) => this.key(id));
      const rawValues = await this.redis.getClient().mGet(keys);
      rawValues.forEach((raw, index) => {
        if (!raw) return;
        try {
          const plans = JSON.parse(raw) as unknown;
          const photographerId = photographerIds[index];
          if (
            Array.isArray(plans) &&
            plans.every(
              (plan) =>
                !!plan &&
                typeof plan === 'object' &&
                plan.photographer_id === photographerId &&
                plan.is_active === true,
            )
          )
            values.set(photographerId, plans as BookingPlanEntity[]);
        } catch {
          // A malformed value is a cache miss and will be repaired from the database.
        }
      });
    } catch (error) {
      this.logger.warn(
        `Booking plan cache read failed: ${this.errorMessage(error)}`,
      );
    }

    return values;
  }

  /** Cache active plan lists, including empty lists, so photographers without a plan do not miss repeatedly. */
  async setMany(
    plansByPhotographer: ReadonlyMap<string, readonly BookingPlanEntity[]>,
  ): Promise<void> {
    if (plansByPhotographer.size === 0) return;
    try {
      await Promise.all(
        [...plansByPhotographer].map(([photographerId, plans]) =>
          this.redis.setJson(
            this.key(photographerId),
            plans,
            PublicBookingPlansCache.TTL_SECONDS,
          ),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `Booking plan cache write failed: ${this.errorMessage(error)}`,
      );
    }
  }

  /** Delete one photographer's public plan list after its write transaction commits. */
  async invalidate(photographerId: string): Promise<void> {
    try {
      await this.redis.del(this.key(photographerId));
    } catch (error) {
      this.logger.warn(
        `Booking plan cache invalidation failed: ${this.errorMessage(error)}`,
      );
    }
  }

  private key(photographerId: string): string {
    return `${PublicBookingPlansCache.KEY_PREFIX}:${photographerId}`;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
