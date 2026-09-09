import type { Type } from '@nestjs/common';
import {
  BookingApiModule,
  CalendarApiModule,
  ChatApiModule,
  IdentityApiModule,
  LocationApiModule,
  MediaApiModule,
  ModerationApiModule,
  NotificationApiModule,
  PaymentApiModule,
  PhotographerApiModule,
  PortfolioApiModule,
  ReviewApiModule,
  SubscriptionApiModule,
} from './modules';

export const apiFeatureModuleRegistry: ReadonlyArray<
  readonly [name: string, module: Type]
> = [
  ['IDENTITY', IdentityApiModule],
  ['PHOTOGRAPHER', PhotographerApiModule],
  ['PORTFOLIO', PortfolioApiModule],
  ['BOOKING', BookingApiModule],
  ['PAYMENT', PaymentApiModule],
  ['CALENDAR', CalendarApiModule],
  ['MEDIA', MediaApiModule],
  ['REVIEW', ReviewApiModule],
  ['SUBSCRIPTION', SubscriptionApiModule],
  ['MODERATION', ModerationApiModule],
  ['NOTIFICATION', NotificationApiModule],
  ['CHAT', ChatApiModule],
  ['LOCATION', LocationApiModule],
];

export function selectApiFeatureModules(
  env: NodeJS.ProcessEnv = process.env,
): Type[] {
  return apiFeatureModuleRegistry
    .filter(([name]) => env[`FEATURE_${name}_ENABLED`] !== 'false')
    .map(([, module]) => module);
}

export const enabledApiFeatureModules = selectApiFeatureModules();
