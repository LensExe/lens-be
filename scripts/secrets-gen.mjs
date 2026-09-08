#!/usr/bin/env node
/**
 * scripts/secrets-gen.mjs -- Tự động khởi tạo và đồng bộ biến môi trường cho lens-backend
 *
 * Cách dùng:
 *   node scripts/secrets-gen.mjs              Tạo các biến/secret còn thiếu vào file .env
 *   node scripts/secrets-gen.mjs --force      Tạo mới lại toàn bộ (ghi đè tất cả secrets)
 *   node scripts/secrets-gen.mjs --encrypt    Sau khi tạo xong, tự động mã hóa ra file .env.enc (qua SOPS)
 *   node scripts/secrets-gen.mjs --dry-run    Xem trước danh sách secrets sẽ tạo mà không ghi ra đĩa
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CREDENTIALS_SCHEMA } from './credentials.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const envEncPath = join(root, '.env.enc');

const args = process.argv.slice(2);
const isForce = args.includes('--force');
const shouldEncrypt = args.includes('--encrypt');
const isDryRun = args.includes('--dry-run');

/**
 * Đọc file .env hiện tại thành key-value map
 */
function loadExistingEnv() {
  if (!existsSync(envPath)) {
    return {};
  }
  const content = readFileSync(envPath, 'utf8');
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      result[key] = val;
    }
  }
  return result;
}

async function main() {
  console.log('\n🔐 [Secrets Gen] Bắt đầu xử lý biến môi trường cho lens-backend...\n');

  const existing = isForce ? {} : loadExistingEnv();
  const finalEnv = {};
  let generatedCount = 0;
  let preservedCount = 0;

  for (const [key, meta] of Object.entries(CREDENTIALS_SCHEMA)) {
    if (existing[key] !== undefined && !isForce) {
      finalEnv[key] = existing[key];
      preservedCount++;
    } else {
      let value = '';
      if (typeof meta.generator === 'function') {
        value = meta.generator();
      } else if (meta.default !== undefined) {
        value = meta.default;
      }
      finalEnv[key] = value;
      generatedCount++;
      console.log(`  ✨ [Tạo mới] ${key.padEnd(28)} : ${meta.description}`);
    }
  }

  // Tạo nội dung file .env có cấu trúc nhóm rõ ràng
  const fileContent = `# ==============================================================================
# LENS BACKEND - APPLICATION ENVIRONMENT VARIABLES
# Tự động sinh bởi: node scripts/secrets-gen.mjs
# Ngày tạo/cập nhật: ${new Date().toISOString()}
# ==============================================================================

# ── App & Server ──
PORT=${finalEnv.PORT}
NODE_ENV=${finalEnv.NODE_ENV}
CORS_ORIGINS=${finalEnv.CORS_ORIGINS}

# ── Database (PostgreSQL) ──
DB_HOST=${finalEnv.DB_HOST}
DB_PORT=${finalEnv.DB_PORT}
DB_USERNAME=${finalEnv.DB_USERNAME}
DB_PASSWORD=${finalEnv.DB_PASSWORD}
DB_NAME=${finalEnv.DB_NAME}
DB_SYNCHRONIZE=${finalEnv.DB_SYNCHRONIZE}
DB_LOGGING=${finalEnv.DB_LOGGING}

# ── Redis Cache & Socket.io ──
REDIS_HOST=${finalEnv.REDIS_HOST}
REDIS_PORT=${finalEnv.REDIS_PORT}
REDIS_PASSWORD=${finalEnv.REDIS_PASSWORD}

# ── MinIO (S3 Object Storage) ──
S3_MINIO_ENDPOINT=${finalEnv.S3_MINIO_ENDPOINT}
S3_MINIO_ACCESS_KEY_ID=${finalEnv.S3_MINIO_ACCESS_KEY_ID}
S3_MINIO_SECRET_ACCESS_KEY=${finalEnv.S3_MINIO_SECRET_ACCESS_KEY}
S3_MINIO_BUCKET=${finalEnv.S3_MINIO_BUCKET}

# ── Keycloak Identity & Access Management ──
KEYCLOAK_URL=${finalEnv.KEYCLOAK_URL}
KEYCLOAK_AUTH_SERVER_URL=${finalEnv.KEYCLOAK_AUTH_SERVER_URL}
KEYCLOAK_REALM=${finalEnv.KEYCLOAK_REALM}
KEYCLOAK_CLIENT_ID=${finalEnv.KEYCLOAK_CLIENT_ID}
KEYCLOAK_SECRET=${finalEnv.KEYCLOAK_SECRET}
KEYCLOAK_ADMIN_USERNAME=${finalEnv.KEYCLOAK_ADMIN_USERNAME}
KEYCLOAK_ADMIN_PASSWORD=${finalEnv.KEYCLOAK_ADMIN_PASSWORD}

# ── Security & Authentication ──
JWT_SECRET=${finalEnv.JWT_SECRET}
JWT_EXPIRES_IN=${finalEnv.JWT_EXPIRES_IN}
COOKIE_SECRET=${finalEnv.COOKIE_SECRET}
COOKIE_DOMAIN=${finalEnv.COOKIE_DOMAIN}
`;

  if (isDryRun) {
    console.log('\n[DRY RUN] Nội dung file .env dự kiến:');
    console.log(fileContent);
    return;
  }

  writeFileSync(envPath, fileContent, 'utf8');
  console.log(`\n💾 Đã lưu file: ${envPath}`);
  console.log(`   - Số biến tạo mới: ${generatedCount}`);
  console.log(`   - Số biến giữ nguyên: ${preservedCount}`);

  // Nếu người dùng yêu cầu mã hóa luôn qua SOPS
  if (shouldEncrypt) {
    console.log('\n🔒 Đang mã hóa file qua SOPS...');
    const sopsResult = spawnSync('sops', ['-e', envPath], {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
    });

    if (sopsResult.status === 0 && sopsResult.stdout) {
      writeFileSync(envEncPath, sopsResult.stdout, 'utf8');
      console.log(`✅ Đã mã hóa thành công ra file: ${envEncPath}`);
    } else {
      console.warn('⚠️  Không thể chạy sops tự động. Lỗi:', sopsResult.stderr || 'sops not found');
      console.log('   Bạn có thể chạy thủ công: pnpm run secret:encrypt');
    }
  }

  console.log('\n🎉 Hoàn thành xử lý secrets!\n');
}

main().catch(console.error);
