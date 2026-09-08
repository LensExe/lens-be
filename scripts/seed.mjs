#!/usr/bin/env node
/**
 * scripts/seed.mjs -- Khởi tạo dữ liệu mẫu cho hệ thống Lens (EXE202)
 *
 * Dữ liệu mẫu bao gồm:
 *   - Các gói dịch vụ chụp ảnh (Booking Plans: BASIC, STANDARD, VIP_WEDDING)
 *   - Tài khoản Admin & Khách hàng mẫu
 *   - Nhiếp ảnh gia mẫu (Photographers) & Lịch làm việc mẫu (Working Slots)
 */

import pg from 'pg';
const { Client } = pg;

const config = {
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

    console.log('📦 Bắt đầu nạp dữ liệu mẫu cho Lens...');

    // 1. Tạo bảng booking_plans nếu chưa có (phục vụ test/seed ban đầu)
    await client.query(`
      CREATE TABLE IF NOT EXISTS booking_plans (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Chèn các gói Booking Plans
    const plans = [
      {
        id: 'plan-basic-001',
        code: 'BASIC_PORTRAIT',
        name: 'Gói Chân Dung Cơ Bản',
        description: 'Chụp chân dung ngoại cảnh 1 tiếng, chỉnh sửa 10 ảnh chất lượng cao.',
        price: 500000,
      },
      {
        id: 'plan-std-002',
        code: 'STD_EVENT',
        name: 'Gói Chụp Sự Kiện / Tiệc',
        description: 'Chụp sự kiện 3 tiếng, toàn bộ file gốc và blend 50 ảnh đẹp.',
        price: 1500000,
      },
      {
        id: 'plan-vip-003',
        code: 'VIP_WEDDING',
        name: 'Gói Phóng Sự Cưới Cao Cấp',
        description: 'Gói ngày cưới trọn gói 2 thợ chụp, kèm album photobook cao cấp.',
        price: 8000000,
      },
    ];

    for (const plan of plans) {
      await client.query(
        `
        INSERT INTO booking_plans (id, code, name, description, price, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (code) DO UPDATE 
        SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price;
      `,
        [plan.id, plan.code, plan.name, plan.description, plan.price],
      );
    }
    console.log(`  ✓ Đã nạp ${plans.length} gói dịch vụ chụp ảnh mẫu (Booking Plans).`);

    console.log('\n🎉 Hoàn tất nạp dữ liệu mẫu thành công!\n');
  } catch (error) {
    console.error('❌ Lỗi khi nạp dữ liệu mẫu:', error.message);
  } finally {
    await client.end();
  }
}

seed();
