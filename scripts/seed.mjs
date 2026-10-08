#!/usr/bin/env node
/** Load curated demo fixtures and deterministic, scalable local data for Lens. */

import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareStockMedia, seedStockMedia } from './seed-media.mjs';

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

const seedProfiles = {
  none: { photographers: 0, customers: 0, bookings: 0 },
  small: { photographers: 20, customers: 100, bookings: 500 },
  medium: { photographers: 100, customers: 1000, bookings: 5000 },
  large: { photographers: 1000, customers: 10000, bookings: 100000 },
};
const maxSeedCounts = {
  photographers: 100_000,
  customers: 500_000,
  bookings: 1_000_000,
};

function countFromEnvironment(name, fallback, maximum) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count > maximum) {
    throw new Error(`${name} must be between 0 and ${maximum}`);
  }
  return count;
}

function seedCounts() {
  const profileName = process.env.SEED_SCALE || 'none';
  const profile = Object.hasOwn(seedProfiles, profileName)
    ? seedProfiles[profileName]
    : undefined;
  if (!profile) {
    throw new Error(
      `SEED_SCALE must be one of: ${Object.keys(seedProfiles).join(', ')}`,
    );
  }

  const counts = {
    photographers: countFromEnvironment(
      'SEED_PHOTOGRAPHERS',
      profile.photographers,
      maxSeedCounts.photographers,
    ),
    customers: countFromEnvironment(
      'SEED_CUSTOMERS',
      profile.customers,
      maxSeedCounts.customers,
    ),
    bookings: countFromEnvironment(
      'SEED_BOOKINGS',
      profile.bookings,
      maxSeedCounts.bookings,
    ),
  };

  if (counts.bookings > 0 && (!counts.photographers || !counts.customers)) {
    throw new Error(
      'SEED_BOOKINGS requires at least one generated photographer and customer',
    );
  }
  return { profileName, counts };
}

function databaseTarget() {
  const url = config.connectionString ? new URL(config.connectionString) : null;
  return `${url?.hostname ?? config.host}:${url?.port || config.port}/${url?.pathname.slice(1) || config.database}`;
}

/** Seed the database with the selected profile and any explicit count overrides. */
async function seed() {
  const { profileName, counts } = seedCounts();
  const client = new Client(config);
  let scaleTransactionOpen = false;
  let stockMedia;

  console.log(`\n🌱 [Seed] Đang kết nối tới PostgreSQL [${databaseTarget()}]...`);
  try {
    // Validate local MinIO and bundled assets before changing either seeded dataset.
    stockMedia = await prepareStockMedia();
    await client.connect();
    console.log('✅ Đã kết nối cơ sở dữ liệu thành công.');

    const demoSeedPath = resolve(__dirname, '../migrations/seed_lens-dev.sql');
    const scaleSeedPath = resolve(__dirname, '../migrations/seed_lens-scale.sql');
    console.log(`📦 Đang đọc dữ liệu demo: ${demoSeedPath}`);
    const demoSeedSql = readFileSync(demoSeedPath, 'utf8');
    const scaleSeedSql = readFileSync(scaleSeedPath, 'utf8');

    console.log('🚀 Đang nạp dữ liệu demo cố định...');
    await client.query(demoSeedSql);

    console.log(
      `🚀 Đang nạp dữ liệu ${profileName}: ${counts.photographers} photographers, ${counts.customers} customers, ${counts.bookings} bookings...`,
    );
    await client.query('BEGIN');
    scaleTransactionOpen = true;
    await client.query(
      `SELECT
        set_config('lens.seed.photographers', $1, true),
        set_config('lens.seed.customers', $2, true),
        set_config('lens.seed.bookings', $3, true)`,
      [
        String(counts.photographers),
        String(counts.customers),
        String(counts.bookings),
      ],
    );
    await client.query(scaleSeedSql);
    await client.query('COMMIT');
    scaleTransactionOpen = false;

    await seedStockMedia(client, stockMedia);

    console.log('\n🎉 Hoàn tất nạp dữ liệu Lens thành công!');
    console.log('   - Bộ dữ liệu tổng hợp cũ đã được thay thế bằng quy mô được chọn.');
    console.log('   - User tổng hợp dùng domain .invalid, không được tạo trong Keycloak.');
    console.log('   - Ảnh stock được ghi vào MinIO và gắn vào portfolio demo.');
  } catch (error) {
    if (scaleTransactionOpen) await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Lỗi khi nạp dữ liệu mẫu:', error.message);
    process.exitCode = 1;
  } finally {
    stockMedia?.client.destroy();
    await client.end();
  }
}

seed();
