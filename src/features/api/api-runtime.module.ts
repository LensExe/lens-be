import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule, LensCacheModule, RedisModule } from '@shared/database';
import { KeycloakModule } from '@shared/integrations/keycloak/keycloak.module';
import { NotificationModule } from '@shared/integrations/notification/notification.module';
import { PaymentGateway } from '@shared/integrations/payment/payment.port';
import { RealtimePublisher } from '@shared/integrations/realtime/realtime-publisher.port';
import { PayOsGateway } from '@shared/integrations/payment/payos-gateway.service';
import { S3Module } from '@shared/integrations/s3/s3.module';
import { BookingUseCases } from '@modules/booking/booking.use-case';
import { CalendarUseCases } from '@modules/calendar/calendar.use-case';
import { ReviewUseCases } from '@modules/feedback/review.use-case';
import { MediaUseCases } from '@modules/media/media.use-case';
import { ModerationUseCases } from '@modules/moderation/moderation.use-case';
import { PaymentUseCases } from '@modules/payment/payment.use-case';
import { PhotographerUseCases } from '@modules/photographer/photographer.use-case';
import { PortfolioUseCases } from '@modules/photographer/portfolio.use-case';
import { BookingPlanUseCases } from '@modules/photographer/booking-plan.use-case';
import { RankUseCases } from '@modules/photographer/rank.use-case';
import { BadgeUseCases } from '@modules/photographer/badge.use-case';
import { SubscriptionUseCases } from '@modules/subscription/subscription.use-case';
import { IdentityUseCases } from '@modules/identity/identity.use-case';
import { RatingUpdaterPort } from '@modules/booking/ports/rating-updater.port';
import { PendingBookingsPort } from '@modules/calendar/ports/pending-bookings.port';
import { CollaborationTimesPort } from '@modules/calendar/ports/collaboration-times.port';
import { MediaOwnershipPort } from '@modules/photographer/ports/media-ownership.port';
import { SubscriptionPaymentsPort } from '@modules/subscription/ports/subscription-payments.port';
import { PhotographerRolePort } from '@modules/photographer/ports/photographer-role.port';
import { WorkingHoursPort } from '@modules/photographer/ports/working-hours.port';
import { LensGateway } from '../socketio/socketio.gateway';
import { OutboxWorker } from '../workers/outbox.worker';
import { KeycloakGuard } from './auth/keycloak.guard';
import { DomainErrorFilter } from '@shared/platform/exceptions/domain-error.filter';
import { TypeOrmErrorFilter } from '@shared/platform/exceptions/typeorm-error.filter';
import { EnvModule } from '@shared/platform/env';

const applicationServices = [
  BookingUseCases,
  CalendarUseCases,
  ReviewUseCases,
  MediaUseCases,
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
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    LensCacheModule,
    KeycloakModule,
    NotificationModule,
    S3Module,
  ],
  providers: [
    ...applicationServices,
    { provide: RatingUpdaterPort, useExisting: ReviewUseCases },
    { provide: PendingBookingsPort, useExisting: BookingUseCases },
    { provide: CollaborationTimesPort, useExisting: BookingUseCases },
    { provide: WorkingHoursPort, useExisting: CalendarUseCases },
    { provide: MediaOwnershipPort, useExisting: MediaUseCases },
    { provide: SubscriptionPaymentsPort, useExisting: PaymentUseCases },
    // TODO(identity): thay bằng provider thật của identity (docs/IDENTITY_TODO.md, việc 7).
    // Tạm thời duyệt hồ sơ không gán role Keycloak.
    {
      provide: PhotographerRolePort,
      useValue: {
        grant: () => Promise.resolve(),
        revoke: () => Promise.resolve(),
      },
    },
    { provide: PaymentGateway, useClass: PayOsGateway },
    { provide: APP_GUARD, useClass: KeycloakGuard },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    { provide: APP_FILTER, useClass: TypeOrmErrorFilter },
    LensGateway,
    { provide: RealtimePublisher, useExisting: LensGateway },
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
