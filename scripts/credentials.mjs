/**
 * `scripts/credentials.mjs` — credential catalog defining secrets for lens-backend.
 *
 * Normalized to the array format `[CREDENTIALS, DERIVED_CREDENTIALS, REDIS_LANE_ALIASES, APP_CREDENTIALS]`,
 * for compatibility with infrastructure-management scripts (sync, secrets-gen, stack-secret).
 */

import { randomBytes } from 'node:crypto';

/**
 * Generate a cryptographically secure random string with the requested length and format.
 *
 * @param length Value used by the operation: length.
 * @param type Type of object or operation.
 * @returns Result returned by `slice`.
 */
export const generateSecret = (length = 32, type = 'hex') => {
  if (type === 'hex') {
    return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }
  if (type === 'base64') {
    return randomBytes(length).toString('base64url').slice(0, length);
  }

  // Safe alphanumeric and special characters (avoid quotes and `#`, which can break `.env` parsing).
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@%^&*()_+~=';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};

/**
 * Generate a random password that meets the required length and character group rules.
 *
 * @param length Value used by the operation: length.
 * @returns Result returned by `generateSecret`.
 */
export const generatePassword = (length = 24) => generateSecret(length, 'alphanumeric');

/**
 * Core service secrets and passwords (database, cache, MinIO, Keycloak, JWT).
 */
export const CREDENTIALS = [
  // ── Database (PostgreSQL) ──
  {
    env: 'DB_PASSWORD',
    file: 'postgres-password.key',
    default: 'Postgres@#_Lens_EXE202_FPT_FA26',
    generator: () => 'Postgres@#_Lens_EXE202_FPT_FA26',
    description: 'Mật khẩu kết nối PostgreSQL của ứng dụng',
  },
  {
    env: 'POSTGRES_PASSWORD',
    file: 'postgres-password.key',
    default: 'Postgres@#_Lens_EXE202_FPT_FA26',
    generator: () => 'Postgres@#_Lens_EXE202_FPT_FA26',
    description: 'Mật khẩu root PostgreSQL trong container docker',
  },

  // ── Redis ──
  {
    env: 'REDIS_PASSWORD',
    file: 'redis-password.key',
    default: 'Redis@#_Lens_EXE202_FPT_FA26',
    generator: () => 'Redis@#_Lens_EXE202_FPT_FA26',
    description: 'Mật khẩu truy cập Redis requirepass',
  },

  // ── MinIO (S3) ──
  {
    env: 'S3_MINIO_SECRET_ACCESS_KEY',
    file: 'minio-root-password.key',
    default: 'Minio@#_Lens_EXE202_FPT_FA26',
    generator: () => 'Minio@#_Lens_EXE202_FPT_FA26',
    description: 'Secret Access Key truy cập S3 MinIO API',
  },
  {
    env: 'MINIO_ROOT_PASSWORD',
    file: 'minio-root-password.key',
    default: 'Minio@#_Lens_EXE202_FPT_FA26',
    generator: () => 'Minio@#_Lens_EXE202_FPT_FA26',
    description: 'Mật khẩu root MinIO cho container',
  },

  // ── Keycloak (IAM) ──
  {
    env: 'KEYCLOAK_ADMIN_PASSWORD',
    file: 'keycloak-admin-password.key',
    default: 'Keycloak@#_Lens_EXE202_FPT_FA26',
    generator: () => 'Keycloak@#_Lens_EXE202_FPT_FA26',
    description: 'Mật khẩu quản trị viên Keycloak',
  },
  {
    env: 'KEYCLOAK_SECRET',
    file: 'keycloak-client-secret.key',
    generator: () => generateSecret(32, 'hex'),
    description: 'Client Secret của lens-backend trên Keycloak',
  },
  {
    env: 'KEYCLOAK_ADMIN_CLIENT_SECRET',
    file: 'keycloak-admin-client-secret.key',
    generator: () => generateSecret(32, 'hex'),
    description: 'Client Secret của service account quản trị user Keycloak',
  },

  // ── Security & Authentication ──
  {
    env: 'JWT_SECRET',
    file: 'jwt-secret.key',
    generator: () => generateSecret(64, 'hex'),
    description: 'Khóa bí mật mã hóa JWT token',
  },
  {
    env: 'COOKIE_SECRET',
    file: 'cookie-secret.key',
    generator: () => generateSecret(32, 'hex'),
    description: 'Khóa ký và mã hóa cookie phiên',
  },
];

/**
 * List of derived credentials.
 */
export const DERIVED_CREDENTIALS = [
  {
    env: 'DATABASE_URL',
    file: 'database-url.env',
    description: 'Chuỗi kết nối đầy đủ tới PostgreSQL',
  },
  {
    env: 'REDIS_URL',
    file: 'redis-url.env',
    description: 'Chuỗi URL kết nối Redis',
  },
];

/**
 * Aliases that share the Redis password across services.
 */
export const REDIS_LANE_ALIASES = [
  'REDIS_CACHE_PASSWORD',
  'REDIS_BULLMQ_PASSWORD',
  'REDIS_THROTTLER_PASSWORD',
  'REDIS_ADAPTER_PASSWORD',
];

/**
 * Shared application environment settings.
 */
export const APP_CREDENTIALS = [
  // ── App & Server ──
  { env: 'PORT', default: '3000', description: 'Port chạy ứng dụng' },
  { env: 'NODE_ENV', default: 'development', description: 'Môi trường thực thi' },
  {
    env: 'CORS_ORIGINS',
    default: 'http://localhost:3000,http://localhost:5173,http://localhost:8080',
    description: 'CORS origins',
  },

  // ── Database params ──
  { env: 'DB_HOST', default: 'localhost', description: 'Host PostgreSQL' },
  { env: 'DB_PORT', default: '5433', description: 'Port PostgreSQL host' },
  { env: 'DB_USERNAME', default: 'lens-postgres', description: 'User PostgreSQL' },
  { env: 'DB_NAME', default: 'lens', description: 'Tên Database chính' },
  { env: 'DB_SYNCHRONIZE', default: 'true', description: 'Đồng bộ TypeORM schema' },
  { env: 'DB_LOGGING', default: 'false', description: 'Bật log SQL query' },

  // ── Redis params ──
  { env: 'REDIS_HOST', default: 'localhost', description: 'Host Redis' },
  { env: 'REDIS_PORT', default: '6380', description: 'Port Redis host' },

  // ── S3-compatible object storage params ──
  {
    env: 'S3_PROVIDER',
    default: 'minio',
    description: 'Provider lưu trữ: minio, digitalocean hoặc cloud',
  },
  {
    env: 'S3_MINIO_ENDPOINT',
    default: 'http://localhost:9000',
    description: 'MinIO S3 API endpoint',
  },
  {
    env: 'S3_MINIO_PUBLIC_ENDPOINT',
    default: 'http://localhost:9000',
    description: 'MinIO endpoint public dùng cho presigned URL',
  },
  {
    env: 'S3_MINIO_REGION',
    default: 'us-east-1',
    description: 'MinIO signing region',
  },
  {
    env: 'S3_MINIO_ACCESS_KEY_ID',
    default: 'LensMinioAdmin',
    description: 'S3 Access Key ID',
  },
  {
    env: 'S3_MINIO_BUCKET',
    default: 'lens',
    description: 'MinIO bucket ảnh & media',
  },
  {
    env: 'S3_MINIO_PRESIGNED_URL_TTL_SECONDS',
    default: '900',
    description: 'Thời hạn presigned URL của MinIO',
  },

  {
    env: 'S3_DIGITALOCEAN_ENDPOINT',
    default: '',
    description: 'Spaces S3 API endpoint; để trống sẽ suy ra từ region',
  },
  {
    env: 'S3_DIGITALOCEAN_PUBLIC_ENDPOINT',
    default: '',
    description: 'Spaces S3 API endpoint truy cập được từ client để ký URL',
  },
  {
    env: 'S3_DIGITALOCEAN_CDN_ENDPOINT',
    default: '',
    description: 'CDN/custom domain base URL cho object public trong Space',
  },
  {
    env: 'S3_DIGITALOCEAN_REGION',
    default: '',
    description: 'DigitalOcean Spaces region, ví dụ sgp1 hoặc nyc3',
  },
  {
    env: 'S3_DIGITALOCEAN_ACCESS_KEY_ID',
    default: '',
    description: 'DigitalOcean Spaces access key ID',
  },
  {
    env: 'S3_DIGITALOCEAN_SECRET_ACCESS_KEY',
    default: '',
    description: 'DigitalOcean Spaces secret access key',
  },
  {
    env: 'S3_DIGITALOCEAN_BUCKET',
    default: '',
    description: 'Tên DigitalOcean Space/bucket',
  },
  {
    env: 'S3_DIGITALOCEAN_PRESIGNED_URL_TTL_SECONDS',
    default: '900',
    description: 'Thời hạn presigned URL của Spaces',
  },

  {
    env: 'S3_CLOUD_ENDPOINT',
    default: '',
    description: 'S3-compatible cloud API endpoint; để trống khi dùng AWS S3',
  },
  {
    env: 'S3_CLOUD_PUBLIC_ENDPOINT',
    default: '',
    description:
      'S3-compatible cloud endpoint truy cập được từ client để ký URL',
  },
  {
    env: 'S3_CLOUD_REGION',
    default: 'us-east-1',
    description: 'Cloud S3 signing region',
  },
  {
    env: 'S3_CLOUD_ACCESS_KEY_ID',
    default: '',
    description: 'Cloud S3 access key ID (để trống nếu dùng IAM)',
  },
  {
    env: 'S3_CLOUD_SECRET_ACCESS_KEY',
    default: '',
    description: 'Cloud S3 secret access key (để trống nếu dùng IAM)',
  },
  { env: 'S3_CLOUD_BUCKET', default: '', description: 'Cloud S3 bucket' },
  {
    env: 'S3_CLOUD_PRESIGNED_URL_TTL_SECONDS',
    default: '900',
    description: 'Thời hạn presigned URL của cloud S3',
  },

  // ── Keycloak params ──
  { env: 'KEYCLOAK_URL', default: 'http://localhost:8089', description: 'URL máy chủ Keycloak' },
  { env: 'KEYCLOAK_AUTH_SERVER_URL', default: 'http://localhost:8089', description: 'Auth server URL Keycloak' },
  { env: 'KEYCLOAK_REALM', default: 'lens', description: 'Realm dự án' },
  { env: 'KEYCLOAK_CLIENT_ID', default: 'lens-backend', description: 'Client ID đăng ký Keycloak' },
  { env: 'KEYCLOAK_ADMIN_CLIENT_ID', default: 'lens-backend-admin', description: 'Client ID service account quản trị user Keycloak' },
  { env: 'KEYCLOAK_ADMIN_USERNAME', default: 'lens-admin-keycloak', description: 'Tài khoản admin Keycloak' },

  // ── Auth params ──
  { env: 'JWT_EXPIRES_IN', default: '7d', description: 'Thời hạn token' },
  { env: 'COOKIE_DOMAIN', default: 'localhost', description: 'Domain cookie' },
];

/**
 * Adapter object schema (backward compatibility for scripts that access values by key).
 */
export const CREDENTIALS_SCHEMA = Object.fromEntries(
  [...CREDENTIALS, ...APP_CREDENTIALS].map((item) => [
    item.env,
    {
      default: item.default,
      generator: item.generator,
      description: item.description,
      file: item.file,
    },
  ]),
);
