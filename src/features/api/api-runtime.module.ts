import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '@shared/database';
import { KeycloakModule } from '@shared/integrations/keycloak/keycloak.module';
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
import { SubscriptionUseCases } from '@modules/subscription/subscription.use-case';
import { IdentityUseCases } from '@modules/identity/identity.use-case';
import { RatingUpdaterPort } from '@modules/booking/ports/rating-updater.port';
import { MediaOwnershipPort } from '@modules/photographer/ports/media-ownership.port';
import { SubscriptionPaymentsPort } from '@modules/subscription/ports/subscription-payments.port';
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
  SubscriptionUseCases,
  IdentityUseCases,
];

@Global()
@Module({
  imports: [
    EnvModule,
    CqrsModule.forRoot(),
    DatabaseModule,
    KeycloakModule,
    S3Module,
  ],
  providers: [
    ...applicationServices,
    { provide: RatingUpdaterPort, useExisting: ReviewUseCases },
    { provide: MediaOwnershipPort, useExisting: MediaUseCases },
    { provide: SubscriptionPaymentsPort, useExisting: PaymentUseCases },
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
