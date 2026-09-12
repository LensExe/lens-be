import { Inject } from '@nestjs/common';
import {
  DIGITAL_OCEAN_S3,
  DIGITAL_OCEAN_S3_PRESIGN,
  MINIO_S3,
  MINIO_S3_PRESIGN,
} from './constants/s3';

export const InjectDigitalOceanS3 = () => Inject(DIGITAL_OCEAN_S3);
export const InjectDigitalOceanS3Presign = () =>
  Inject(DIGITAL_OCEAN_S3_PRESIGN);
export const InjectMinioS3 = () => Inject(MINIO_S3);
export const InjectMinioS3Presign = () => Inject(MINIO_S3_PRESIGN);
