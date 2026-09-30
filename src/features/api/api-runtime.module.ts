import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import {
  DatabaseModule,
  LensCacheModule,
  RedisModule,
  getRedisConfig,
} from '@shared/database';
import { KeycloakModule } from '@shared/integrations/keycloak/keycloak.module';
import { NotificationModule } from '@shared/integrations/notification/notification.module';
import { PaymentGateway } from '@shared/integrations/payment/payment.port';
import { RealtimePublisher } from '@shared/integrations/realtime/realtime-publisher.port';
import { PayOsGateway } from '@shared/integrations/payment/payos-gateway.service';
import { S3Module } from '@shared/integrations/s3/s3.module';
import { BookingUseCases } from '@modules/booking/core/booking.use-case';
import { CalendarUseCases } from '@modules/calendar/schedule/calendar.use-case';
import { CustomerUseCases } from '@modules/customer/customer.use-case';
import { ReviewUseCases } from '@modules/feedback/review/review.use-case';
import { MediaUseCases } from '@modules/media/media.use-case';
import { MediaImageProcessingService } from '@modules/media/media-image-processing.service';
import { ModerationUseCases } from '@modules/moderation/moderation.use-case';
import { PaymentUseCases } from '@modules/payment/payment.use-case';
import { PhotographerUseCases } from '@modules/photographer/photographer.use-case';
import { PortfolioUseCases } from '@modules/photographer/portfolio/portfolio.use-case';
import { BookingPlanUseCases } from '@modules/photographer/booking-plan/booking-plan.use-case';
import { RankUseCases } from '@modules/photographer/rank/rank.use-case';
import { BadgeUseCases } from '@modules/photographer/badge/badge.use-case';
import { SubscriptionUseCases } from '@modules/subscription/subscription.use-case';
import { IdentityUseCases } from '@modules/identity/identity.use-case';
import { RatingUpdaterPort } from '@modules/booking/ports/rating-updater.port';
import { CustomerBookingStatsPort } from '@modules/customer/ports/customer-booking-stats.port';
import { PhotographerSearchPort } from '@modules/customer/ports/photographer-search.port';
import { PaidAmountsPort } from '@modules/booking/ports/paid-amounts.port';
import { PendingBookingsPort } from '@modules/calendar/ports/pending-bookings.port';
import { PhotographerBookingsPort } from '@modules/calendar/ports/photographer-bookings.port';
import { MediaOwnershipPort } from '@modules/photographer/ports/media-ownership.port';
import { SubscriptionPaymentsPort } from '@modules/subscription/ports/subscription-payments.port';
import { PhotographerRolePort } from '@modules/photographer/ports/photographer-role.port';
import { WorkingHoursPort } from '@modules/photographer/ports/working-hours.port';
import { PhotographerRatingsPort } from '@modules/photographer/ports/photographer-ratings.port';
import { PlanBookingsPort } from '@modules/photographer/ports/plan-bookings.port';
import { LensGateway } from '../socketio/socketio.gateway';
import { OutboxWorker } from '../workers/outbox.worker';
import { KeycloakGuard } from './auth/keycloak.guard';
import { DomainErrorFilter } from '@shared/platform/exceptions/domain-error.filter';
import { TypeOrmErrorFilter } from '@shared/platform/exceptions/typeorm-error.filter';
import { EnvModule } from '@shared/platform/env';

// Dùng cho các lệnh (commands) và truy vấn (queries)
const applicationServices = [
  BookingUseCases,
  CalendarUseCases,
  CustomerUseCases,
  ReviewUseCases,
  MediaUseCases,
  MediaImageProcessingService,
  ModerationUseCases,
  PaymentUseCases,
  PhotographerUseCases,
  PortfolioUseCases,
  BookingPlanUseCases,
  RankUseCases,
  BadgeUseCases,
  SubscriptionUseCases,
  IdentityUseCases,
];

@Global()
@Module({
  imports: [
    EnvModule,
    CqrsModule.forRoot(),
    BullModule.forRootAsync({
      imports: [EnvModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = getRedisConfig(configService);
        return {
          connection: {
            host: redis.host,
            port: redis.port,
            password: redis.password,
          },
        };
      },
    }),
    CqrsModule.forRoot(), // Dùng cho các lệnh (commands) và truy vấn (queries)
    ScheduleModule.forRoot(), // Dùng cho các tác vụ định kỳ như cleanup
    DatabaseModule,
    RedisModule,
    LensCacheModule,
    KeycloakModule,
    NotificationModule,
    S3Module,
  ],
  providers: [
    ...applicationServices,
    {
      provide: RatingUpdaterPort,
      useExisting: ReviewUseCases,
    },
    {
      provide: PaidAmountsPort,
      useExisting: PaymentUseCases,
    },
    {
      provide: CustomerBookingStatsPort,
      useExisting: BookingUseCases,
    },
    {
      provide: PhotographerSearchPort,
      useExisting: PhotographerUseCases,
    },
    {
      provide: PendingBookingsPort,
      useExisting: BookingUseCases,
    },
    {
      provide: PhotographerBookingsPort,
      useExisting: BookingUseCases,
    },
    {
      provide: WorkingHoursPort,
      useExisting: CalendarUseCases,
    },
    {
      provide: PhotographerRatingsPort,
      useExisting: ReviewUseCases,
    },
    {
      provide: PlanBookingsPort,
      useExisting: BookingUseCases,
    },
    {
      provide: MediaOwnershipPort,
      useExisting: MediaUseCases,
    },
    {
      provide: SubscriptionPaymentsPort,
      useExisting: PaymentUseCases,
    },
    // TODO(identity): thay bằng provider thật của identity (docs/IDENTITY_TODO.md, việc 7).
    // Tạm thời duyệt hồ sơ không gán role Keycloak.
    {
      provide: PhotographerRolePort,
      useValue: {
        grant: () => Promise.resolve(),
        revoke: () => Promise.resolve(),
      },
    },
    {
      provide: PaymentGateway,
      useClass: PayOsGateway,
    },
    {
      provide: APP_GUARD,
      useClass: KeycloakGuard,
    },
    {
      provide: APP_FILTER,
      useClass: DomainErrorFilter,
    },
    {
      provide: APP_FILTER,
      useClass: TypeOrmErrorFilter,
    },
    LensGateway,
    {
      provide: RealtimePublisher,
      useExisting: LensGateway,
    },
    OutboxWorker,
  ],
  exports: [
    CqrsModule,
    EnvModule,
    KeycloakModule,
    ...applicationServices,
    S3Module,
    PaymentGateway,
    RealtimePublisher,
  ],
})
export class ApiRuntimeModule {}
