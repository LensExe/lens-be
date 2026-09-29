import { Inject } from '@nestjs/common';
import { ACTIVE_S3, ACTIVE_S3_PRESIGN } from './constants/s3';

/**
 * Inject instance S3Client chính của hệ thống.
 * Dùng cho các tác vụ backend gọi API trực tiếp tới storage qua endpoint nội bộ.
 */
export const InjectActiveS3 = () => Inject(ACTIVE_S3);

/**
 * Inject instance S3Client dùng riêng cho việc tạo Presigned URL.
 * Client này được cấu hình với publicEndpoint để client bên ngoài (FE/Mobile) có thể truy cập được.
 */
export const InjectActiveS3Presign = () => Inject(ACTIVE_S3_PRESIGN);
