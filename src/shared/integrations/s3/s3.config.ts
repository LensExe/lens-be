import { DomainError } from '../../platform/exceptions/domain.error';
import {
  DEFAULT_PRESIGNED_URL_TTL_SECONDS,
  DEFAULT_S3_REGION,
} from './constants/s3';
import { S3Provider } from './enums/s3';
import type { S3ProviderConfig } from './types/config';

const positiveInteger = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return parsed > 0 ? parsed : fallback;
};

/**
 * Đọc và ánh xạ cấu hình S3 từ biến môi trường (process.env) theo từng Provider.
 *
 * - Tự động fallback: ưu tiên biến môi trường riêng của provider, nếu thiếu thì lấy biến chung.
 * - Thiết lập giá trị mặc định cho region, TTL presigned URL, và forcePathStyle (MinIO: true, Cloud: false).
 * - Các trường accessKeyId, secretAccessKey, bucket... trả về ở dạng optional (có thể undefined nếu chưa cấu hình).
 *
 * @param provider - Nhà cung cấp S3 (MinIO hoặc cloud S3-compatible)
 * @returns Object S3ProviderConfig chứa các thông số kết nối
 */
export function getS3ProviderConfig(provider: S3Provider): S3ProviderConfig {
  switch (provider) {
    case S3Provider.Cloud:
      return {
        endpoint: process.env.S3_CLOUD_ENDPOINT,
        publicEndpoint: process.env.S3_CLOUD_PUBLIC_ENDPOINT,
        region: process.env.S3_CLOUD_REGION ?? DEFAULT_S3_REGION,
        accessKeyId: process.env.S3_CLOUD_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_CLOUD_SECRET_ACCESS_KEY,
        bucket: process.env.S3_CLOUD_BUCKET,
        forcePathStyle: false,
        presignedUrlTtlSeconds: positiveInteger(
          process.env.S3_CLOUD_PRESIGNED_URL_TTL_SECONDS,
          DEFAULT_PRESIGNED_URL_TTL_SECONDS,
        ),
      };
    case S3Provider.Minio:
      return {
        endpoint: process.env.S3_MINIO_ENDPOINT,
        publicEndpoint: process.env.S3_MINIO_PUBLIC_ENDPOINT,
        region: process.env.S3_MINIO_REGION ?? DEFAULT_S3_REGION,
        accessKeyId: process.env.S3_MINIO_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_MINIO_SECRET_ACCESS_KEY,
        bucket: process.env.S3_MINIO_BUCKET,
        forcePathStyle: true,
        presignedUrlTtlSeconds: positiveInteger(
          process.env.S3_MINIO_PRESIGNED_URL_TTL_SECONDS,
          DEFAULT_PRESIGNED_URL_TTL_SECONDS,
        ),
      };
    default:
      throw new DomainError(
        'invalid',
        `Unsupported S3 provider: ${String(provider)}`,
      );
  }
}

/**
 * Lấy cấu hình và bắt buộc (validate) các trường quan trọng phải tồn tại để kết nối.
 *
 * - Ném lỗi DomainError('unavailable') nếu thiếu accessKeyId, secretAccessKey hoặc bucket.
 * - Riêng với MinIO: bắt buộc phải có endpoint (vì là dịch vụ tự host).
 * - Ép kiểu trả về (Type Narrowing): biến các trường bắt buộc từ `string | undefined` thành
 *   `string` chắc chắn tồn tại (Required), giúp code phía sau an toàn về mặt type mà không cần check lại.
 *
 * @param provider - Nhà cung cấp S3 (MinIO hoặc cloud S3-compatible)
 * @throws DomainError nếu cấu hình bị thiếu hoặc không hợp lệ
 * @returns Cấu hình S3 hoàn chỉnh với các trường xác thực đã được đảm bảo tồn tại
 */
export function requireS3ProviderConfig(
  provider: S3Provider,
): Required<Omit<S3ProviderConfig, 'endpoint' | 'publicEndpoint'>> &
  Pick<S3ProviderConfig, 'endpoint' | 'publicEndpoint'> {
  const config = getS3ProviderConfig(provider);
  if (!config.accessKeyId || !config.secretAccessKey || !config.bucket) {
    throw new DomainError(
      'unavailable',
      `Object storage provider "${provider}" is not configured`,
    );
  }
  if (provider === S3Provider.Minio && !config.endpoint) {
    throw new DomainError('unavailable', 'MinIO endpoint is not configured');
  }
  return config as Required<
    Omit<S3ProviderConfig, 'endpoint' | 'publicEndpoint'>
  > &
    Pick<S3ProviderConfig, 'endpoint' | 'publicEndpoint'>;
}
