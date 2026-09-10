import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { KeycloakModule } from '@shared/integrations/keycloak/keycloak.module';
import {
  PaymentGateway,
  RealtimePublisher,
  UnitOfWork,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { PostgresUnitOfWork } from '@shared/database/unit-of-work/postgres-unit-of-work';
import { PayOsGateway } from '@shared/integrations/payment/payos-gateway.service';
import { S3Module } from '@shared/integrations/s3/s3.module';
import { BookingUseCases } from '@modules/booking/application/bookings';
import { CalendarUseCases } from '@modules/calendar/application/calendar';
import { ReviewUseCases } from '@modules/feedback/application/reviews';
import { LocationUseCases } from '@modules/location/application/location';
import { MediaUseCases } from '@modules/media/application/media';
import { ModerationUseCases } from '@modules/moderation/application/moderation';
import { PaymentUseCases } from '@modules/payment/application/payments';
import { PhotographerUseCases } from '@modules/photographer/application/photographers';
import { PortfolioUseCases } from '@modules/photographer/application/portfolios';
import { SubscriptionUseCases } from '@modules/subscription/application/subscriptions';
import { IdentityUseCases } from '@modules/user/application/identity';
import { LensGateway } from '../socketio/socketio.gateway';
import { OutboxWorker } from '../workers/outbox.worker';
import { KeycloakGuard } from './auth/keycloak.guard';
import { DomainErrorFilter } from '@shared/platform/exceptions/domain-error.filter';

const applicationServices = [
  BookingUseCases,
  CalendarUseCases,
  ReviewUseCases,
  LocationUseCases,
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
  imports: [CqrsModule.forRoot(), KeycloakModule, S3Module],
  providers: [
    ...applicationServices,
    { provide: UnitOfWork, useClass: PostgresUnitOfWork },
    { provide: PaymentGateway, useClass: PayOsGateway },
    { provide: APP_GUARD, useClass: KeycloakGuard },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    LensGateway,
    { provide: RealtimePublisher, useExisting: LensGateway },
    OutboxWorker,
  ],
  exports: [
    CqrsModule,
    ...applicationServices,
    UnitOfWork,
    S3Module,
    PaymentGateway,
    RealtimePublisher,
  ],
})
export class ApiRuntimeModule {}
