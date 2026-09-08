/**
 * scripts/credentials.mjs -- Danh mục bảng định nghĩa thông tin xác thực cho lens-backend
 *
 * Chuẩn hóa theo format mảng [CREDENTIALS, DERIVED_CREDENTIALS, REDIS_LANE_ALIASES, APP_CREDENTIALS]
 * để tương thích với các script quản lý hạ tầng (sync, secrets-gen, stack-secret).
 */

import { randomBytes } from 'node:crypto';

/**
 * Sinh chuỗi ngẫu nhiên an toàn theo độ dài và định dạng
 */
export const generateSecret = (length = 32, type = 'hex') => {
  if (type === 'hex') {
    return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }
  if (type === 'base64') {
    return randomBytes(length).toString('base64url').slice(0, length);
  }

  // Alphanumeric + ký tự đặc biệt an toàn (tránh dấu nháy và dấu # gây lỗi parse .env)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@%^&*()_+~=';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};

export const generatePassword = (length = 24) => generateSecret(length, 'alphanumeric');

/**
 * Các bí mật / mật khẩu dịch vụ cốt lõi (Database, Cache, MinIO, Keycloak, JWT)
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
 * Danh sách bí mật suy dẫn (Derived credentials)
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
 * Các alias dùng chung mật khẩu Redis cho các tác vụ
 */
export const REDIS_LANE_ALIASES = [
  'REDIS_CACHE_PASSWORD',
  'REDIS_BULLMQ_PASSWORD',
  'REDIS_THROTTLER_PASSWORD',
  'REDIS_ADAPTER_PASSWORD',
];

/**
 * Cấu hình tham số môi trường chung của ứng dụng
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

  // ── MinIO params ──
  { env: 'S3_MINIO_ENDPOINT', default: 'http://localhost:9000', description: 'Endpoint S3' },
  { env: 'S3_MINIO_ACCESS_KEY_ID', default: 'LensMinioAdmin', description: 'S3 Access Key ID' },
  { env: 'S3_MINIO_BUCKET', default: 'lens', description: 'Bucket ảnh & media' },

  // ── Keycloak params ──
  { env: 'KEYCLOAK_URL', default: 'http://localhost:8089', description: 'URL máy chủ Keycloak' },
  { env: 'KEYCLOAK_AUTH_SERVER_URL', default: 'http://localhost:8089', description: 'Auth server URL Keycloak' },
  { env: 'KEYCLOAK_REALM', default: 'lens', description: 'Realm dự án' },
  { env: 'KEYCLOAK_CLIENT_ID', default: 'lens-backend', description: 'Client ID đăng ký Keycloak' },
  { env: 'KEYCLOAK_ADMIN_USERNAME', default: 'lens-admin-keycloak', description: 'Tài khoản admin Keycloak' },

  // ── Auth params ──
  { env: 'JWT_EXPIRES_IN', default: '7d', description: 'Thời hạn token' },
  { env: 'COOKIE_DOMAIN', default: 'localhost', description: 'Domain cookie' },
];

/**
 * Adapter Object Schema (phục vụ tương thích ngược nếu script nào gọi qua key)
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
