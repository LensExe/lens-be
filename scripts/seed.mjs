#!/usr/bin/env node
/**
 * `scripts/seed.mjs` — load standard seed data for the Lens (EXE202) system.
 *
 * This file reads and executes the SQL file `migrations/seed_lens-dev.sql`:
 * - All primary and foreign keys use UUID v4 (RFC 4122).
 * - Seeds 20 database tables, including users, admins, customers, and photographers.
 *     photographer_ratings, booking_plans, photographer_plans, subscriptions,
 *     offline_slots, wallets, media, portfolios, bookings, transactions,
 *     payment_webhooks, refund_requests, booking_deliveries, feedbacks,
 *     reports, outbox_events.
 * - `ON CONFLICT (id) DO NOTHING` makes repeated runs safe (idempotent).
 */

import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Automatically load `.env` if it exists.
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

/**
 * Seed the database using the current configuration.
 *
 * @returns No value is returned.
 */
async function seed() {
  console.log(`\n🌱 [Seed] Đang kết nối tới PostgreSQL [${config.host}:${config.port}/${config.database}]...`);
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ Đã kết nối cơ sở dữ liệu thành công.');

    const seedSqlPath = resolve(__dirname, '../migrations/seed_lens-dev.sql');
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
