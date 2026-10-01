import type { Type } from '@nestjs/common';
import {
  BookingApiModule,
  CalendarApiModule,
  CustomerApiModule,
  IdentityApiModule,
  MediaApiModule,
  ModerationApiModule,
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
  ['CUSTOMER', CustomerApiModule],
  ['PHOTOGRAPHER', PhotographerApiModule],
  ['PORTFOLIO', PortfolioApiModule],
  ['BOOKING', BookingApiModule],
  ['PAYMENT', PaymentApiModule],
  ['CALENDAR', CalendarApiModule],
  ['MEDIA', MediaApiModule],
  ['REVIEW', ReviewApiModule],
  ['SUBSCRIPTION', SubscriptionApiModule],
  ['MODERATION', ModerationApiModule],
];

/**
 * Select the API modules to initialize based on the environment configuration.
 *
 * @param env Environment configuration to read.
 * @returns Result returned by `map`.
 */
export function selectApiFeatureModules(
  env: NodeJS.ProcessEnv = process.env,
): Type[] {
  return apiFeatureModuleRegistry
    .filter(([name]) => env[`FEATURE_${name}_ENABLED`] !== 'false')
    .map(([, module]) => module);
}

export const enabledApiFeatureModules = selectApiFeatureModules();
