#!/usr/bin/env node
/**
 * scripts/seed.mjs -- Nạp dữ liệu mẫu (Seed Data) chuẩn cho hệ thống Lens (EXE202)
 *
 * Tệp này đọc và thực thi toàn bộ tệp SQL 'migrations/seed_lens.sql':
 *   - Toàn bộ khóa chính và khóa ngoại đều là UUID v4 (RFC 4122).
 *   - Đồng bộ 20 bảng cơ sở dữ liệu: users, admins, customers, photographers,
 *     photographer_ratings, booking_plans, photographer_plans, subscriptions,
 *     offline_slots, wallets, media, portfolios, bookings, transactions,
 *     payment_webhooks, refund_requests, booking_deliveries, feedbacks,
 *     reports, outbox_events.
 *   - Sử dụng 'ON CONFLICT (id) DO NOTHING' bảo đảm an toàn khi chạy nhiều lần (idempotent).
 */

import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Tự động tải file .env nếu có
try {
  process.loadEnvFile?.();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const config = {
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5433),
  user: process.env.DB_USERNAME || 'lens-postgres',
  password: process.env.DB_PASSWORD || 'Postgres@#_Lens_EXE202_FPT_FA26',
  database: process.env.DB_NAME || 'lens',
};

async function seed() {
  console.log(`\n🌱 [Seed] Đang kết nối tới PostgreSQL [${config.host}:${config.port}/${config.database}]...`);
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ Đã kết nối cơ sở dữ liệu thành công.');

    const seedSqlPath = resolve(__dirname, '../migrations/seed_lens.sql');
    console.log(`📦 Đang đọc dữ liệu từ tệp: ${seedSqlPath}`);
    const seedSql = readFileSync(seedSqlPath, 'utf8');

    console.log('🚀 Đang nạp dữ liệu mẫu vào 20 bảng với chuẩn UUID v4...');
    await client.query(seedSql);

    console.log('\n🎉 Hoàn tất nạp dữ liệu mẫu Lens thành công!');
    console.log('   - Toàn bộ ID khóa chính/ngoại: Chuẩn UUID v4.');
    console.log('   - Toàn bộ mốc thời gian: Chuẩn hóa đồng bộ năm 2026.');
    console.log('   - An toàn tuyệt đối (Idempotent): Không ghi đè hay sinh lỗi trùng lặp.\n');
  } catch (error) {
    console.error('\n❌ Lỗi khi nạp dữ liệu mẫu:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

seed();
