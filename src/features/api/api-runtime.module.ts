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
import { KeycloakUserService } from '@shared/integrations/keycloak/user.service';
import { NotificationModule } from '@shared/integrations/notification/notification.module';
import { KafkaNotificationProducer } from '@shared/integrations/notification/kafka-notification.producer';
import { NotificationOutboxPublisher } from '@shared/integrations/notification/notification-outbox.publisher';
import { PaymentGateway } from '@shared/integrations/payment/port/payment.port';
import { PaymentModule } from '@shared/integrations/payment/payment.module';
import { RealtimePublisher } from '@shared/integrations/realtime/realtime-publisher.port';
import { S3Module } from '@shared/integrations/s3/s3.module';
import { BookingUseCases } from '@modules/booking/core/booking.use-case';
import { CalendarUseCases } from '@modules/calendar/schedule/calendar.use-case';
import { CustomerUseCases } from '@modules/customer/customer.use-case';
import { ReviewUseCases } from '@modules/feedback/review/review.use-case';
import { MediaUseCases } from '@modules/media/media.use-case';
import { MediaStorageUsageService } from '@modules/media/media-storage-usage.service';
import { MediaImageProcessingService } from '@modules/media/media-image-processing.service';
import { ModerationDashboardUseCases } from '@modules/moderation/dashboard/dashboard.use-case';
import { ModerationReportUseCases } from '@modules/moderation/report/report.use-case';
import { PaymentUseCases } from '@modules/payment/payment.use-case';
import { RefundUseCases } from '@modules/payment/refund/refund.use-case';
import { TransactionUseCases } from '@modules/payment/transaction/transaction.use-case';
import { WalletUseCases } from '@modules/payment/wallet/wallet.use-case';
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
import { BookingPaymentSettlementPort } from '@modules/booking/ports/booking-payment-settlement.port';
import { BookingDisputeReportPort } from '@modules/booking/ports/booking-dispute-report.port';
import { PendingBookingsPort } from '@modules/calendar/ports/pending-bookings.port';
import { PhotographerBookingsPort } from '@modules/calendar/ports/photographer-bookings.port';
import { MediaOwnershipPort } from '@modules/photographer/ports/media-ownership.port';
import { ReportEvidenceMediaPort } from '@modules/moderation/ports/report-evidence-media.port';
import { SubscriptionPaymentsPort } from '@modules/subscription/ports/subscription-payments.port';
import { SubscriptionStorageQuotaPort } from '@modules/media/ports/subscription-storage-quota.port';
import { SubscriptionStorageUsagePort } from '@modules/subscription/ports/subscription-storage-usage.port';
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

// Used for commands and queries.
const applicationServices = [
  BookingUseCases,
  CalendarUseCases,
  CustomerUseCases,
  ReviewUseCases,
  MediaUseCases,
  MediaStorageUsageService,
  MediaImageProcessingService,
  ModerationDashboardUseCases,
  ModerationReportUseCases,
  PaymentUseCases,
  RefundUseCases,
  TransactionUseCases,
  WalletUseCases,
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
    CqrsModule.forRoot(), // Used for commands and queries.
    ScheduleModule.forRoot(), // Used for scheduled tasks such as cleanup.
    DatabaseModule,
    RedisModule,
    LensCacheModule,
    KeycloakModule,
    NotificationModule,
    PaymentModule,
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
      useExisting: TransactionUseCases,
    },
    {
      provide: BookingPaymentSettlementPort,
      useExisting: PaymentUseCases,
    },
    {
      provide: BookingDisputeReportPort,
      useExisting: ModerationReportUseCases,
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
      provide: ReportEvidenceMediaPort,
      useExisting: MediaUseCases,
    },
    {
      provide: SubscriptionPaymentsPort,
      useExisting: PaymentUseCases,
    },
    {
      provide: SubscriptionStorageQuotaPort,
      useExisting: SubscriptionUseCases,
    },
    {
      provide: SubscriptionStorageUsagePort,
      useExisting: MediaStorageUsageService,
    },
    {
      provide: PhotographerRolePort,
      inject: [KeycloakUserService],
      useFactory: (keycloakUsers: KeycloakUserService) => ({
        grant: (keycloakUserId: string) =>
          keycloakUsers.assignRealmRoleToUser(keycloakUserId, 'photographer'),
        revoke: (keycloakUserId: string) =>
          keycloakUsers.removeRealmRoleFromUser(keycloakUserId, 'photographer'),
      }),
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
    KafkaNotificationProducer,
    NotificationOutboxPublisher,
    {
      provide: RealtimePublisher,
      useExisting: NotificationOutboxPublisher,
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
    RedisModule,
  ],
})
export class ApiRuntimeModule {}
