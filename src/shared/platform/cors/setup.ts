import { INestApplication } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { envConfig } from '../env/env.config';

/**
 * Creates standard CORS options based on application configuration.
 */
export const createCorsOptions = (): CorsOptions => {
  const { origins } = envConfig().cors;
  return {
    origin: origins.includes('*') ? true : origins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'x-device-fingerprint',
    ],
  };
};

/**
 * Sets up CORS middleware on the NestJS application instance.
 */
export const setupCors = (app: INestApplication): void => {
  app.enableCors(createCorsOptions());
};
