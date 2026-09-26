import { S3Client } from '@aws-sdk/client-s3';
import type { Provider } from '@nestjs/common';
import {
  ACTIVE_S3,
  ACTIVE_S3_PRESIGN,
  getActiveS3Provider,
} from './constants/s3';
import { getS3ProviderConfig } from './s3.config';
import type { S3ProviderConfig } from './types/config';

/**
 * Khởi tạo đối tượng S3Client từ AWS SDK v3 dựa theo cấu hình.
 *
 * @param config - Cấu hình S3 của provider (endpoint, credentials, region, forcePathStyle...)
 * @param presign - Cờ xác định loại client:
 *   - true: Dùng publicEndpoint (nếu có) để ký Presigned URL cho trình duyệt/client ngoài truy cập.
 *   - false: Dùng endpoint nội bộ để backend gọi trực tiếp tới storage.
 * @returns Instance S3Client đã được cấu hình hoàn chỉnh
 */
const createClient = (config: S3ProviderConfig, presign: boolean): S3Client => {
  const endpoint = presign
    ? config.publicEndpoint?.trim() || config.endpoint
    : config.endpoint;
  const credentials =
    config.accessKeyId && config.secretAccessKey
      ? {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        }
      : undefined;
  return new S3Client({
    endpoint: endpoint || undefined,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials,
  });
};

/**
 * Helper tạo một custom Provider cho NestJS Dependency Injection.
 * Chỉ khởi tạo client cho provider active của process hiện tại.
 *
 * @param token - Chuỗi token định danh trong DI container
 * @param presign - Có phải là client chuyên dùng để tạo presigned URL hay không (mặc định: false)
 * @returns Provider<S3Client> đăng ký vào Module của NestJS
 */
const clientProvider = (
  token: string,
  presign = false,
): Provider<S3Client> => ({
  provide: token,
  useFactory: () =>
    createClient(
      getS3ProviderConfig(getActiveS3Provider()), // get S3 active config
      presign, // is presign (true or false)
    ),
});

export const s3ClientProviders: Provider[] = [
  clientProvider(ACTIVE_S3),
  clientProvider(ACTIVE_S3_PRESIGN, true),
];
