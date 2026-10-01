import { Inject } from '@nestjs/common';
import { ACTIVE_S3, ACTIVE_S3_PRESIGN } from './constants/s3';

/**
 * Inject the system's primary `S3Client` instance.
 * Used by backend tasks that call the storage API directly through an internal endpoint.
 *
 * @returns Result returned by `Inject`.
 */
export const InjectActiveS3 = () => Inject(ACTIVE_S3);

/**
 * Inject the `S3Client` instance dedicated to generating presigned URLs.
 * This client is configured with `publicEndpoint` so external clients (web and mobile) can access it.
 *
 * @returns Result returned by `Inject`.
 */
export const InjectActiveS3Presign = () => Inject(ACTIVE_S3_PRESIGN);
