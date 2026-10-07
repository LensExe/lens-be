-- ============================================================================
-- Lens Platform - Curated local demo fixtures
-- ============================================================================
-- Local development fixture. Generated identities use the reserved .test domain.
-- Lê Quang Huy is the only account here based on profile details supplied by the user.
--
-- Characteristics:
--   - Standard SQL data export syntax: all tables use INSERT INTO ... VALUES (...)
--   - Fixed demo UUIDs keep foreign-key relationships stable across re-runs.
--   - The companion seed_lens-scale.sql fixture adds deterministic, configurable volume.
--   - Idempotent inserts preserve existing demo rows; selected time-sensitive demo rows refresh.
--
-- Import instructions:
--   Option 1: npm run db:seed
--   Option 2: psql -h <host> -p <port> -U <user> -d <database> -f migrations/seed_lens-dev.sql
-- ============================================================================

BEGIN;

-- Keep the curated event history anchored to the local calendar date when this seed runs.
CREATE OR REPLACE FUNCTION pg_temp.lens_seed_at(p_day_offset integer, p_local_time time)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $seed_time$
  SELECT (
    date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')
    + p_day_offset * interval '1 day'
    + (p_local_time - time '00:00')
  ) AT TIME ZONE 'Asia/Ho_Chi_Minh'
$seed_time$;

-- ============================================================================
-- 1. USERS table (16 accounts: 1 admin, 5 customers, 10 photographers)
-- ============================================================================
INSERT INTO users (id, keycloak_id, fullname, email, phone_number, avatar_url, gender, dob, status, created_at, updated_at)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Quản trị viên Lens', 'admin@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-264, time '08:30:00'), pg_temp.lens_seed_at(-264, time '08:30:00')),
  ('a0000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000005', 'Nguyễn An Bình', 'an.binh.photo@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-220, time '09:00:00'), pg_temp.lens_seed_at(-220, time '09:00:00')),
  ('b0000000-0000-4000-8000-000000000001', '9111e83a-3e3f-4a8b-a75c-b509fa39130f', 'Lê Quang Huy', 'lequanghuy.photo@gmail.com', '0983112233', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'male', '1994-03-12', 'active', pg_temp.lens_seed_at(-238, time '10:15:00'), pg_temp.lens_seed_at(-238, time '10:15:00')),
  ('b0000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002', 'Phạm Minh Tuấn', 'minh.tuan.photo@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-233, time '14:20:00'), pg_temp.lens_seed_at(-233, time '14:20:00')),
  ('b0000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000003', 'Đỗ Thu Thảo', 'thu.thao.photo@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-219, time '11:00:00'), pg_temp.lens_seed_at(-219, time '11:00:00')),
  ('b0000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000004', 'Vũ Hoàng Long', 'hoang.long.photo@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-208, time '16:45:00'), pg_temp.lens_seed_at(-208, time '16:45:00')),
  ('c0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Hoàng Mai Anh', 'mai.anh@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-188, time '09:30:00'), pg_temp.lens_seed_at(-188, time '09:30:00')),
  ('c0000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', 'Trần Quốc Bảo', 'quoc.bao@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-184, time '10:00:00'), pg_temp.lens_seed_at(-184, time '10:00:00')),
  ('c0000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000003', 'Bùi Phương Linh', 'phuong.linh@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-136, time '09:15:00'), pg_temp.lens_seed_at(-136, time '09:15:00')),
  ('c0000000-0000-4000-8000-000000000009', 'c1000000-0000-4000-8000-000000000004', 'Vũ Thanh Tùng', 'thanh.tung@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-128, time '10:20:00'), pg_temp.lens_seed_at(-128, time '10:20:00')),
  ('c0000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000005', 'Đặng Hải Yến', 'hai.yen@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-121, time '14:45:00'), pg_temp.lens_seed_at(-121, time '14:45:00')),
  ('c0000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000006', 'Trần Khánh Vy', 'khanh.vy.photo@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-179, time '14:15:00'), pg_temp.lens_seed_at(-179, time '14:15:00')),
  ('c0000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000007', 'Phan Ngọc Linh', 'ngoc.linh.photo@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-174, time '15:40:00'), pg_temp.lens_seed_at(-174, time '15:40:00')),
  ('c0000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000008', 'Võ Đức Thành', 'duc.thanh.photo@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-158, time '11:20:00'), pg_temp.lens_seed_at(-158, time '11:20:00')),
  ('c0000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000009', 'Hoàng Gia Bảo', 'gia.bao.photo@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-149, time '16:10:00'), pg_temp.lens_seed_at(-149, time '16:10:00')),
  ('c0000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000010', 'Bùi Thu Trang', 'thu.trang.photo@lens.test', NULL, NULL, NULL, NULL, 'active', pg_temp.lens_seed_at(-144, time '13:00:00'), pg_temp.lens_seed_at(-144, time '13:00:00'))
ON CONFLICT (id) DO UPDATE SET
  keycloak_id = EXCLUDED.keycloak_id,
  fullname = EXCLUDED.fullname,
  email = EXCLUDED.email,
  phone_number = EXCLUDED.phone_number,
  avatar_url = EXCLUDED.avatar_url,
  gender = EXCLUDED.gender,
  dob = EXCLUDED.dob,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 2. ADMINS table (administrator roles)
-- ============================================================================
INSERT INTO admins (id, user_id, is_active, created_at, updated_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', true, pg_temp.lens_seed_at(-264, time '08:30:00'), pg_temp.lens_seed_at(-264, time '08:30:00'))
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

UPDATE photographers
SET approved_by = NULL
WHERE approved_by = '10000000-0000-4000-8000-000000000002';

DELETE FROM admins
WHERE id = '10000000-0000-4000-8000-000000000002';

-- ============================================================================
-- 3. CUSTOMERS table (customer profiles)
-- ============================================================================
INSERT INTO customers (id, user_id, preferred_styles, location, created_at, updated_at)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', '["portrait", "vintage", "family"]'::jsonb, 'Đống Đa, Hà Nội', pg_temp.lens_seed_at(-188, time '09:30:00'), pg_temp.lens_seed_at(-188, time '09:30:00')),
  ('20000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', '["wedding", "pre-wedding", "travel"]'::jsonb, 'Quận 7, TP. Hồ Chí Minh', pg_temp.lens_seed_at(-184, time '10:00:00'), pg_temp.lens_seed_at(-184, time '10:00:00')),
  ('20000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000008', '["portrait", "fashion", "travel"]'::jsonb, 'Cầu Giấy, Hà Nội', pg_temp.lens_seed_at(-136, time '09:15:00'), pg_temp.lens_seed_at(-136, time '09:15:00')),
  ('20000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000009', '["family", "event", "lifestyle"]'::jsonb, 'Thủ Đức, TP. Hồ Chí Minh', pg_temp.lens_seed_at(-128, time '10:20:00'), pg_temp.lens_seed_at(-128, time '10:20:00')),
  ('20000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000010', '["wedding", "portrait", "nature"]'::jsonb, 'Hải Châu, Đà Nẵng', pg_temp.lens_seed_at(-121, time '14:45:00'), pg_temp.lens_seed_at(-121, time '14:45:00'))
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  preferred_styles = EXCLUDED.preferred_styles,
  location = EXCLUDED.location,
  updated_at = EXCLUDED.updated_at;

UPDATE bookings
SET customer_id = CASE
  WHEN customer_id IN (
    '20000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000007'
  ) THEN '20000000-0000-4000-8000-000000000001'::uuid
  ELSE '20000000-0000-4000-8000-000000000002'::uuid
END
WHERE customer_id IN (
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000005',
  '20000000-0000-4000-8000-000000000006',
  '20000000-0000-4000-8000-000000000007'
);

UPDATE feedbacks
SET customer_id = CASE
  WHEN customer_id IN (
    '20000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000007'
  ) THEN '20000000-0000-4000-8000-000000000001'::uuid
  ELSE '20000000-0000-4000-8000-000000000002'::uuid
END
WHERE customer_id IN (
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000005',
  '20000000-0000-4000-8000-000000000006',
  '20000000-0000-4000-8000-000000000007'
);

DELETE FROM customers
WHERE user_id IN (
  'c0000000-0000-4000-8000-000000000003',
  'c0000000-0000-4000-8000-000000000004',
  'c0000000-0000-4000-8000-000000000005',
  'c0000000-0000-4000-8000-000000000006',
  'c0000000-0000-4000-8000-000000000007'
);

-- ============================================================================
-- 4. PHOTOGRAPHERS table (professional photographer profiles)
-- ============================================================================
INSERT INTO photographers (id, user_id, tax_code, styles, started_career_at, description, is_verified, verification_status, approved_by, location, is_available, created_at, updated_at)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', NULL, '["portrait", "wedding", "travel"]'::jsonb, 2018, 'Chụp chân dung, ảnh cưới và hành trình du lịch; ưu tiên ánh sáng tự nhiên và khoảnh khắc đời thường.', false, 'pending', NULL, 'Đà Nẵng', true, pg_temp.lens_seed_at(-238, time '10:15:00'), pg_temp.lens_seed_at(-236, time '11:00:00')),
  ('30000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', NULL, '["fashion", "commercial", "portrait"]'::jsonb, 2016, 'Thực hiện lookbook, ảnh sản phẩm thời trang và chân dung thương hiệu cá nhân tại studio hoặc ngoại cảnh.', false, 'pending', NULL, 'Quận 1, TP. Hồ Chí Minh', true, pg_temp.lens_seed_at(-233, time '14:20:00'), pg_temp.lens_seed_at(-232, time '15:30:00')),
  ('30000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', NULL, '["family", "event", "maternity"]'::jsonb, 2019, 'Ghi lại các buổi chụp gia đình, tiệc sinh nhật và sự kiện nhỏ với phong cách tự nhiên, sáng màu.', false, 'pending', NULL, 'Ba Đình, Hà Nội', true, pg_temp.lens_seed_at(-219, time '11:00:00'), pg_temp.lens_seed_at(-218, time '09:45:00')),
  ('30000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', NULL, '["street", "film", "lifestyle"]'::jsonb, 2021, 'Chụp streetwear và lifestyle theo tông film, phù hợp ảnh cá nhân và bộ ảnh đường phố.', false, 'pending', NULL, 'Cầu Giấy, Hà Nội', true, pg_temp.lens_seed_at(-208, time '16:45:00'), pg_temp.lens_seed_at(-206, time '10:20:00')),
  ('30000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', NULL, '["portrait", "graduation", "family"]'::jsonb, 2020, 'Nhận chụp ảnh chân dung, ảnh tốt nghiệp và gia đình; hỗ trợ lên lịch chụp ngoài trời.', false, 'pending', NULL, 'Quận 3, TP. Hồ Chí Minh', true, pg_temp.lens_seed_at(-220, time '09:00:00'), pg_temp.lens_seed_at(-220, time '09:00:00')),
  ('30000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', NULL, '["wedding", "couple", "documentary"]'::jsonb, 2017, 'Tập trung vào ảnh cưới phóng sự và ảnh đôi; ghi lại diễn biến tự nhiên trong ngày chụp.', false, 'pending', NULL, 'TP. Huế', true, pg_temp.lens_seed_at(-179, time '14:15:00'), pg_temp.lens_seed_at(-179, time '14:15:00')),
  ('30000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000004', NULL, '["fashion", "beauty", "portrait"]'::jsonb, 2022, 'Chụp ảnh thời trang, beauty và chân dung cá nhân với lựa chọn bối cảnh studio hoặc ngoại cảnh.', false, 'pending', NULL, 'Quận 7, TP. Hồ Chí Minh', true, pg_temp.lens_seed_at(-174, time '15:40:00'), pg_temp.lens_seed_at(-174, time '15:40:00')),
  ('30000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000005', NULL, '["event", "corporate", "concert"]'::jsonb, 2015, 'Cung cấp ảnh sự kiện, hội nghị và biểu diễn; bàn giao bộ ảnh được chọn theo từng hạng mục.', false, 'pending', NULL, 'Hồng Bàng, Hải Phòng', true, pg_temp.lens_seed_at(-158, time '11:20:00'), pg_temp.lens_seed_at(-158, time '11:20:00')),
  ('30000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000006', NULL, '["food", "product", "commercial"]'::jsonb, 2019, 'Chụp món ăn và sản phẩm cho thực đơn, cửa hàng trực tuyến và nội dung quảng bá.', false, 'pending', NULL, 'Ninh Kiều, Cần Thơ', true, pg_temp.lens_seed_at(-149, time '16:10:00'), pg_temp.lens_seed_at(-149, time '16:10:00')),
  ('30000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000007', NULL, '["family", "travel", "nature"]'::jsonb, 2021, 'Nhận chụp gia đình và ảnh du lịch; tư vấn lịch trình theo ánh sáng và địa điểm.', false, 'pending', NULL, 'Đà Lạt, Lâm Đồng', true, pg_temp.lens_seed_at(-144, time '13:00:00'), pg_temp.lens_seed_at(-144, time '13:00:00'))
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  tax_code = EXCLUDED.tax_code,
  styles = EXCLUDED.styles,
  started_career_at = EXCLUDED.started_career_at,
  description = EXCLUDED.description,
  is_verified = EXCLUDED.is_verified,
  verification_status = EXCLUDED.verification_status,
  approved_by = EXCLUDED.approved_by,
  location = EXCLUDED.location,
  is_available = EXCLUDED.is_available,
  updated_at = EXCLUDED.updated_at;

INSERT INTO ranks (code, name, min_completed, commission_percent)
VALUES
  ('newbie', 'Tân binh', 0, 10),
  ('bronze', 'Đồng', 10, 9),
  ('silver', 'Bạc', 30, 8),
  ('gold', 'Vàng', 60, 7),
  ('diamond', 'Kim cương', 120, 5)
ON CONFLICT (code) DO NOTHING;

-- Seed the badge catalog here as well as in migrations so local reseeds repair
-- databases that were originally created through TypeORM synchronize.
INSERT INTO badges (code, name, description, metric, min_value, min_reviews, is_active)
VALUES
  ('top-rated', 'Đánh giá xuất sắc', 'Điểm đánh giá trung bình từ 4.8 trên ít nhất 1 review trong bộ dữ liệu demo.', 'average_rating', 4.8, 1, true),
  ('punctual', 'Đúng giờ tuyệt đối', 'Điểm đúng giờ trung bình từ 4.8 trên ít nhất 1 review trong bộ dữ liệu demo.', 'average_punctuality', 4.8, 1, true),
  ('loyal', 'Khách quay lại', 'Có ít nhất 5 khách đã đặt lịch lại.', 'return_customers', 5, 0, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metric = EXCLUDED.metric,
  min_value = EXCLUDED.min_value,
  min_reviews = EXCLUDED.min_reviews,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ============================================================================
-- 5. PHOTOGRAPHER_RATINGS table (aggregated photographer ratings)
-- ============================================================================
INSERT INTO photographer_ratings (id, photographer_id, average_rating, total_feedbacks, total_bookings, return_customers, created_at, updated_at)
VALUES
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 4.95, 28, 35, 12, pg_temp.lens_seed_at(-236, time '11:00:00'), pg_temp.lens_seed_at(-57, time '17:00:00')),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 4.88, 42, 50, 18, pg_temp.lens_seed_at(-232, time '15:30:00'), pg_temp.lens_seed_at(-42, time '18:30:00')),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 5.00, 19, 22, 8, pg_temp.lens_seed_at(-218, time '09:45:00'), pg_temp.lens_seed_at(-47, time '14:10:00')),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 4.75, 15, 18, 4, pg_temp.lens_seed_at(-206, time '10:20:00'), pg_temp.lens_seed_at(-35, time '12:00:00')),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 0, 0, 0, 0, now(), now()),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', 0, 0, 0, 0, now(), now()),
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000007', 0, 0, 0, 0, now(), now()),
  ('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000008', 0, 0, 0, 0, now(), now()),
  ('40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000009', 0, 0, 0, 0, now(), now()),
  ('40000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000010', 0, 0, 0, 0, now(), now())
ON CONFLICT (id) DO UPDATE SET
  photographer_id = EXCLUDED.photographer_id,
  average_rating = EXCLUDED.average_rating,
  total_feedbacks = EXCLUDED.total_feedbacks,
  total_bookings = EXCLUDED.total_bookings,
  return_customers = EXCLUDED.return_customers,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 6. BOOKING_PLANS table (service plans offered by each photographer)
-- ============================================================================
INSERT INTO booking_plans (id, photographer_id, name, description, price, duration_minutes, photo_count, retouched_photo_count, features, is_active, created_at, updated_at)
VALUES
  -- Plans offered by Lê Quang Huy
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Chụp chân dung ngoại cảnh (Portrait Demo)', 'Gói chụp chân dung ngoại cảnh 90 phút tại Phố cổ Hội An hoặc bãi biển Mỹ Khê. Hỗ trợ tạo dáng tận tình.', 1000000, 90, 50, 10, '["Toàn bộ ảnh gốc", "10 ảnh chỉnh sửa chuyên sâu", "Hỗ trợ 1 bộ phụ kiện"]'::jsonb, true, pg_temp.lens_seed_at(-233, time '09:00:00'), pg_temp.lens_seed_at(-233, time '09:00:00')),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Phóng sự cưới cao cấp trọn gói', 'Gói chụp phóng sự ngày cưới trọn gói 1 ngày. Bắt trọn những khoảnh khắc thiêng liêng và xúc động nhất.', 6500000, 360, 400, 40, '["Toàn bộ file gốc chất lượng cao", "40 ảnh blend màu nghệ thuật", "Tặng kèm 01 Album Photobook 30x30"]'::jsonb, true, pg_temp.lens_seed_at(-233, time '09:00:00'), pg_temp.lens_seed_at(-233, time '09:00:00')),

  -- Plans offered by Phạm Minh Tuấn
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'Chụp Lookbook thời trang Local Brand', 'Chụp lookbook thương mại cho các bộ sưu tập thời trang. Ekip hỗ trợ setup ánh sáng chuẩn studio.', 3000000, 180, 150, 20, '["Tư vấn concept & moodboard", "Chỉnh màu chuẩn in ấn & web", "Bàn giao file trong 48h"]'::jsonb, true, pg_temp.lens_seed_at(-228, time '10:00:00'), pg_temp.lens_seed_at(-228, time '10:00:00')),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'Chụp ảnh Profile doanh nhân & Beauty', 'Gói chụp profile cá nhân chuyên nghiệp, xây dựng thương hiệu cá nhân trên mạng xã hội và báo chí.', 1800000, 120, 80, 12, '["Chụp tại studio chuẩn ánh sáng", "Makeup nhẹ & làm tóc", "Chỉnh sửa da cao cấp chuyên sâu"]'::jsonb, true, pg_temp.lens_seed_at(-228, time '10:00:00'), pg_temp.lens_seed_at(-228, time '10:00:00')),

  -- Plans offered by Đỗ Thu Thảo
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', 'Chụp ảnh kỷ niệm gia đình ngoại cảnh', 'Buổi chụp ấm cúng cho cả gia đình tại công viên hoặc khuôn viên nhà riêng. Phong cách tự nhiên.', 1500000, 90, 80, 15, '["Toàn bộ file gốc", "15 ảnh chỉnh sửa ấm áp", "Tặng 01 ảnh in ép gỗ mica 20x30"]'::jsonb, true, pg_temp.lens_seed_at(-215, time '08:30:00'), pg_temp.lens_seed_at(-215, time '08:30:00')),
  ('50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000003', 'Chụp tiệc thôi nôi & sinh nhật bé', 'Chụp phóng sự tiệc sinh nhật của bé yêu. Ghi lại trọn vẹn niềm vui của bé và người thân.', 2200000, 180, 200, 30, '["Không giới hạn số lượng ảnh chụp", "Blend màu tươi sáng trẻ trung", "Giao ảnh nhanh trong 24h"]'::jsonb, true, pg_temp.lens_seed_at(-215, time '08:30:00'), pg_temp.lens_seed_at(-215, time '08:30:00')),

  -- Plans offered by Vũ Hoàng Long
  ('50000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000004', 'Chụp ảnh đường phố Streetwear & Film tone', 'Phong cách đường phố đậm chất điện ảnh, tone màu film 35mm hoài cổ cực chất.', 800000, 60, 40, 10, '["Chụp tại các góc phố cổ & cà phê", "Tone màu film vintage độc quyền", "Tặng file scan chất lượng cao"]'::jsonb, true, pg_temp.lens_seed_at(-205, time '14:00:00'), pg_temp.lens_seed_at(-205, time '14:00:00')),
  ('50000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000004', 'Chụp đôi tình nhân Vibe Hàn Quốc', 'Buổi hẹn hò ngọt ngào được ghi lại bằng những khung hình lãng mạn như phim truyền hình.', 1400000, 120, 90, 15, '["Lên kịch bản concept hẹn hò", "Hỗ trợ chọn trang phục đồng điệu", "15 ảnh chỉnh sửa màu cảm xúc"]'::jsonb, true, pg_temp.lens_seed_at(-205, time '14:00:00'), pg_temp.lens_seed_at(-205, time '14:00:00')),
  ('50000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000005', 'Chụp chân dung và tốt nghiệp', 'Buổi chụp 90 phút ngoài trời hoặc tại khuôn viên trường, phù hợp ảnh cá nhân và ảnh tốt nghiệp.', 900000, 90, 45, 8, '["Tư vấn địa điểm và trang phục", "8 ảnh chỉnh sửa", "Bàn giao ảnh qua thư viện trực tuyến"]'::jsonb, true, now(), now()),
  ('50000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000006', 'Ảnh đôi và phóng sự cưới', 'Gói chụp ảnh đôi hoặc phóng sự cưới theo lịch hẹn tại Huế và khu vực lân cận.', 1800000, 120, 80, 12, '["Trao đổi concept trước buổi chụp", "12 ảnh chỉnh sửa", "Bàn giao ảnh bản số"]'::jsonb, true, now(), now()),
  ('50000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000007', 'Lookbook và chân dung studio', 'Buổi chụp thời trang hoặc chân dung cá nhân với lựa chọn studio hay ngoại cảnh.', 1600000, 120, 70, 10, '["Tư vấn bố cục bộ ảnh", "10 ảnh chỉnh sửa", "Bàn giao ảnh bản số"]'::jsonb, true, now(), now()),
  ('50000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000008', 'Ảnh sự kiện và hội nghị', 'Ghi hình sự kiện doanh nghiệp, hội nghị và chương trình biểu diễn trong tối đa ba giờ.', 2500000, 180, 180, 20, '["Chụp theo danh sách hạng mục", "20 ảnh chọn chỉnh sửa", "Bàn giao ảnh bản số"]'::jsonb, true, now(), now()),
  ('50000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000009', 'Ảnh món ăn và sản phẩm', 'Bộ ảnh cho thực đơn, cửa hàng trực tuyến hoặc nội dung quảng bá sản phẩm.', 2000000, 120, 60, 12, '["Tư vấn ánh sáng và bố cục", "12 ảnh chỉnh sửa", "Bàn giao ảnh bản số"]'::jsonb, true, now(), now()),
  ('50000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000010', 'Ảnh gia đình và du lịch', 'Buổi chụp ngoại cảnh tại Đà Lạt cho gia đình, cặp đôi hoặc nhóm bạn.', 1700000, 120, 80, 12, '["Gợi ý lịch chụp theo ánh sáng", "12 ảnh chỉnh sửa", "Bàn giao ảnh bản số"]'::jsonb, true, now(), now())
ON CONFLICT (id) DO UPDATE SET
  photographer_id = EXCLUDED.photographer_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration_minutes = EXCLUDED.duration_minutes,
  photo_count = EXCLUDED.photo_count,
  retouched_photo_count = EXCLUDED.retouched_photo_count,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 7. PHOTOGRAPHER_PLANS table (Lens membership plans for photographers)
-- ============================================================================
INSERT INTO photographer_plans (id, code, name, description, price, is_active, billing_cycle, features, created_at, updated_at)
VALUES
  ('60000000-0000-4000-8000-000000000001', 'VIP_DEMO', 'Gói Trải Nghiệm VIP Demo', 'Gói hội viên 30 ngày, gồm 5 GB lưu trữ và tối đa 5 portfolio.', 99000, true, 30, '[{"code":"storage_limit_bytes","name":"Dung lượng lưu trữ","kind":"quota","unit":"bytes","value":"5 GB"},{"code":"portfolio_limit","name":"Số portfolio tối đa","kind":"quota","unit":"portfolios","value":"5"}]'::jsonb, pg_temp.lens_seed_at(-278, time '00:00:00'), pg_temp.lens_seed_at(-278, time '00:00:00')),
  ('60000000-0000-4000-8000-000000000002', 'PRO_30D', 'Gói Chuyên Nghiệp (30 ngày)', 'Dành cho nhiếp ảnh gia cá nhân: 20 GB lưu trữ và tối đa 10 portfolio.', 199000, true, 30, '[{"code":"storage_limit_bytes","name":"Dung lượng lưu trữ","kind":"quota","unit":"bytes","value":"20 GB"},{"code":"portfolio_limit","name":"Số portfolio tối đa","kind":"quota","unit":"portfolios","value":"10"}]'::jsonb, pg_temp.lens_seed_at(-278, time '00:00:00'), pg_temp.lens_seed_at(-278, time '00:00:00')),
  ('60000000-0000-4000-8000-000000000003', 'PRO_90D', 'Gói Nâng Cao (90 ngày - Tiết kiệm 15%)', 'Gói quý tiết kiệm chi phí, gồm 50 GB lưu trữ và tối đa 30 portfolio.', 499000, true, 90, '[{"code":"storage_limit_bytes","name":"Dung lượng lưu trữ","kind":"quota","unit":"bytes","value":"50 GB"},{"code":"portfolio_limit","name":"Số portfolio tối đa","kind":"quota","unit":"portfolios","value":"30"}]'::jsonb, pg_temp.lens_seed_at(-278, time '00:00:00'), pg_temp.lens_seed_at(-278, time '00:00:00')),
  ('60000000-0000-4000-8000-000000000004', 'STUDIO_365D', 'Gói Doanh Nghiệp / Studio (1 năm)', 'Gói cho studio chuyên nghiệp: 200 GB lưu trữ và không giới hạn portfolio.', 1799000, true, 365, '[{"code":"storage_limit_bytes","name":"Dung lượng lưu trữ","kind":"quota","unit":"bytes","value":"200 GB"},{"code":"portfolio_limit","name":"Số portfolio tối đa","kind":"quota","unit":"portfolios","value":"unlimited"}]'::jsonb, pg_temp.lens_seed_at(-278, time '00:00:00'), pg_temp.lens_seed_at(-278, time '00:00:00'))
ON CONFLICT (id) DO UPDATE SET
  features = EXCLUDED.features;

-- ============================================================================
-- 8. SUBSCRIPTIONS table (active demo memberships relative to the seed run)
-- ============================================================================
INSERT INTO subscriptions (id, photographer_id, plan_id, start_at, end_at, status, auto_renew, price, plan_snapshot, created_at, updated_at)
SELECT
  seed.id::uuid,
  seed.photographer_id::uuid,
  seed.plan_id::uuid,
  seed.start_at,
  seed.end_at,
  seed.status,
  seed.auto_renew,
  seed.price,
  jsonb_build_object(
    'id', plan.id,
    'code', plan.code,
    'name', plan.name,
    'description', plan.description,
    'price', seed.price,
    'billing_cycle', plan.billing_cycle,
    'features', plan.features
  ),
  seed.created_at,
  seed.updated_at
FROM (VALUES
  ('70000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000004', now() - interval '30 days', now() + interval '335 days', 'active', true, 1799000::bigint, now() - interval '30 days', now() - interval '30 days'),
  ('70000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000003', now() - interval '30 days', now() + interval '60 days', 'active', true, 499000::bigint, now() - interval '30 days', now() - interval '30 days'),
  ('70000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002', now() - interval '5 days', now() + interval '25 days', 'active', false, 199000::bigint, now() - interval '5 days', now() - interval '5 days'),
  ('70000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000001', now() - interval '10 days', now() + interval '20 days', 'active', true, 99000::bigint, now() - interval '10 days', now() - interval '10 days')
) AS seed(id, photographer_id, plan_id, start_at, end_at, status, auto_renew, price, created_at, updated_at)
JOIN photographer_plans AS plan ON plan.id = seed.plan_id::uuid
ON CONFLICT (id) DO UPDATE SET
  photographer_id = EXCLUDED.photographer_id,
  plan_id = EXCLUDED.plan_id,
  start_at = EXCLUDED.start_at,
  end_at = EXCLUDED.end_at,
  status = EXCLUDED.status,
  auto_renew = EXCLUDED.auto_renew,
  price = EXCLUDED.price,
  plan_snapshot = EXCLUDED.plan_snapshot,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- The migration-created imported event predates these fixtures; add a stable timeline entry for each demo subscription.
INSERT INTO subscription_status_history (id, subscription_id, event_type, from_status, to_status, actor_user_id, actor_role, note, created_at, updated_at)
VALUES
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'imported', NULL, 'active', NULL, 'system', 'Seeded active demo subscription.', now() - interval '30 days', now() - interval '30 days'),
  ('71000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', 'imported', NULL, 'active', NULL, 'system', 'Seeded active demo subscription.', now() - interval '30 days', now() - interval '30 days'),
  ('71000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000003', 'imported', NULL, 'active', NULL, 'system', 'Seeded active demo subscription.', now() - interval '5 days', now() - interval '5 days'),
  ('71000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000004', 'imported', NULL, 'active', NULL, 'system', 'Seeded active demo subscription.', now() - interval '10 days', now() - interval '10 days')
ON CONFLICT (id) DO UPDATE SET
  from_status = EXCLUDED.from_status,
  to_status = EXCLUDED.to_status,
  note = EXCLUDED.note,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 9. OFFLINE_SLOTS table (photographers' upcoming busy dates relative to the seed run)
-- ============================================================================
INSERT INTO offline_slots (id, photographer_id, "from", "to", reason, created_at, updated_at)
VALUES
  ('80000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '10 days') AT TIME ZONE 'Asia/Ho_Chi_Minh'), ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '11 days') AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'Nghỉ bảo dưỡng và hiệu chuẩn thiết bị máy ảnh', now(), now()),
  ('80000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '40 days') AT TIME ZONE 'Asia/Ho_Chi_Minh'), ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '41 days') AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'Tham gia triển lãm ảnh nghệ thuật Đà Nẵng', now(), now()),
  ('80000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '20 days') AT TIME ZONE 'Asia/Ho_Chi_Minh'), ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '21 days') AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'Lịch cá nhân / Việc gia đình', now(), now()),
  ('80000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000003', ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '35 days') AT TIME ZONE 'Asia/Ho_Chi_Minh'), ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '36 days') AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'Lịch đào tạo trợ lý studio', now(), now())
ON CONFLICT (id) DO UPDATE SET
  "from" = EXCLUDED."from",
  "to" = EXCLUDED."to",
  reason = EXCLUDED.reason,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 10. WALLETS table (internal wallets for all users)
-- ============================================================================
INSERT INTO wallets (id, user_id, balance, frozen_balance, created_at, updated_at)
VALUES
  -- Admin and photographer wallets
  ('90000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 50000000, 0, pg_temp.lens_seed_at(-264, time '08:30:00'), pg_temp.lens_seed_at(-264, time '08:30:00')),
  ('90000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 35000000, 0, pg_temp.lens_seed_at(-263, time '09:00:00'), pg_temp.lens_seed_at(-263, time '09:00:00')),

  -- Photographer wallets (with accumulated revenue)
  ('90000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 13400000, 0, pg_temp.lens_seed_at(-238, time '10:15:00'), pg_temp.lens_seed_at(-26, time '10:15:00')),
  ('90000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000002', 18600000, 900000, pg_temp.lens_seed_at(-233, time '14:20:00'), pg_temp.lens_seed_at(-26, time '14:20:00')),
  ('90000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000003', 8200000, 450000, pg_temp.lens_seed_at(-219, time '11:00:00'), pg_temp.lens_seed_at(-26, time '11:00:00')),
  ('90000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000004', 5500000, 240000, pg_temp.lens_seed_at(-208, time '16:45:00'), pg_temp.lens_seed_at(-26, time '16:45:00')),

  -- Customer and photographer wallets
  ('90000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-000000000001', 2500000, 0, pg_temp.lens_seed_at(-188, time '09:30:00'), pg_temp.lens_seed_at(-188, time '09:30:00')),
  ('90000000-0000-4000-8000-000000000022', 'c0000000-0000-4000-8000-000000000002', 4200000, 0, pg_temp.lens_seed_at(-184, time '10:00:00'), pg_temp.lens_seed_at(-184, time '10:00:00')),
  ('90000000-0000-4000-8000-000000000023', 'c0000000-0000-4000-8000-000000000003', 1800000, 0, pg_temp.lens_seed_at(-179, time '14:15:00'), pg_temp.lens_seed_at(-179, time '14:15:00')),
  ('90000000-0000-4000-8000-000000000024', 'c0000000-0000-4000-8000-000000000004', 500000, 0, pg_temp.lens_seed_at(-174, time '15:40:00'), pg_temp.lens_seed_at(-174, time '15:40:00')),
  ('90000000-0000-4000-8000-000000000025', 'c0000000-0000-4000-8000-000000000005', 3100000, 0, pg_temp.lens_seed_at(-158, time '11:20:00'), pg_temp.lens_seed_at(-158, time '11:20:00')),
  ('90000000-0000-4000-8000-000000000026', 'c0000000-0000-4000-8000-000000000006', 750000, 0, pg_temp.lens_seed_at(-149, time '16:10:00'), pg_temp.lens_seed_at(-149, time '16:10:00')),
  ('90000000-0000-4000-8000-000000000027', 'c0000000-0000-4000-8000-000000000007', 0, 0, pg_temp.lens_seed_at(-144, time '13:00:00'), pg_temp.lens_seed_at(-139, time '18:00:00')),
  ('90000000-0000-4000-8000-000000000028', 'c0000000-0000-4000-8000-000000000008', 1200000, 0, pg_temp.lens_seed_at(-136, time '09:15:00'), pg_temp.lens_seed_at(-136, time '09:15:00')),
  ('90000000-0000-4000-8000-000000000029', 'c0000000-0000-4000-8000-000000000009', 900000, 0, pg_temp.lens_seed_at(-128, time '10:20:00'), pg_temp.lens_seed_at(-128, time '10:20:00')),
  ('90000000-0000-4000-8000-000000000030', 'c0000000-0000-4000-8000-000000000010', 1600000, 0, pg_temp.lens_seed_at(-121, time '14:45:00'), pg_temp.lens_seed_at(-121, time '14:45:00'))
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. MEDIA table (sample system images and videos)
-- ============================================================================
INSERT INTO media (id, user_id, file_key, file_size, content_type, status, created_at, updated_at)
VALUES
  -- Portfolio images for Lê Quang Huy
  ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'portfolios/huy-le/hoian-sunset-01.jpg', 3450000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-219, time '10:00:00'), pg_temp.lens_seed_at(-219, time '10:00:00')),
  ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'portfolios/huy-le/mykhe-beach-02.jpg', 4200000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-219, time '10:00:00'), pg_temp.lens_seed_at(-219, time '10:00:00')),
  ('e0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'portfolios/huy-le/wedding-vintage-03.jpg', 5100000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-219, time '10:00:00'), pg_temp.lens_seed_at(-219, time '10:00:00')),

  -- Portfolio images for Phạm Minh Tuấn
  ('e0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'portfolios/tuan-pham/lookbook-summer-01.jpg', 4800000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-210, time '14:00:00'), pg_temp.lens_seed_at(-210, time '14:00:00')),
  ('e0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 'portfolios/tuan-pham/profile-ceo-02.jpg', 3900000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-210, time '14:00:00'), pg_temp.lens_seed_at(-210, time '14:00:00')),

  ('e0000000-0000-4000-8000-000000000031', 'b0000000-0000-4000-8000-000000000003', 'portfolios/demo-thao/family-01.jpg', 3200000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-219, time '11:00:00'), pg_temp.lens_seed_at(-219, time '11:00:00')),
  ('e0000000-0000-4000-8000-000000000032', 'b0000000-0000-4000-8000-000000000003', 'portfolios/demo-thao/family-02.jpg', 3400000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-219, time '11:00:00'), pg_temp.lens_seed_at(-219, time '11:00:00')),
  ('e0000000-0000-4000-8000-000000000033', 'b0000000-0000-4000-8000-000000000003', 'portfolios/demo-thao/family-03.jpg', 3600000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-219, time '11:00:00'), pg_temp.lens_seed_at(-219, time '11:00:00')),
  ('e0000000-0000-4000-8000-000000000034', 'b0000000-0000-4000-8000-000000000004', 'portfolios/demo-long/street-01.jpg', 3300000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-208, time '16:45:00'), pg_temp.lens_seed_at(-208, time '16:45:00')),
  ('e0000000-0000-4000-8000-000000000035', 'b0000000-0000-4000-8000-000000000004', 'portfolios/demo-long/street-02.jpg', 3700000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-208, time '16:45:00'), pg_temp.lens_seed_at(-208, time '16:45:00')),
  ('e0000000-0000-4000-8000-000000000036', 'b0000000-0000-4000-8000-000000000004', 'portfolios/demo-long/street-03.jpg', 3900000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-208, time '16:45:00'), pg_temp.lens_seed_at(-208, time '16:45:00')),
  ('e0000000-0000-4000-8000-000000000037', 'a0000000-0000-4000-8000-000000000002', 'portfolios/demo-binh/portrait-01.jpg', 3100000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-220, time '09:00:00'), pg_temp.lens_seed_at(-220, time '09:00:00')),
  ('e0000000-0000-4000-8000-000000000038', 'a0000000-0000-4000-8000-000000000002', 'portfolios/demo-binh/portrait-02.jpg', 3500000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-220, time '09:00:00'), pg_temp.lens_seed_at(-220, time '09:00:00')),
  ('e0000000-0000-4000-8000-000000000039', 'a0000000-0000-4000-8000-000000000002', 'portfolios/demo-binh/portrait-03.jpg', 3800000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-220, time '09:00:00'), pg_temp.lens_seed_at(-220, time '09:00:00')),
  ('e0000000-0000-4000-8000-000000000040', 'c0000000-0000-4000-8000-000000000003', 'portfolios/demo-vy/wedding-01.jpg', 4300000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-179, time '14:15:00'), pg_temp.lens_seed_at(-179, time '14:15:00')),
  ('e0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-000000000003', 'portfolios/demo-vy/wedding-02.jpg', 4700000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-179, time '14:15:00'), pg_temp.lens_seed_at(-179, time '14:15:00')),
  ('e0000000-0000-4000-8000-000000000042', 'c0000000-0000-4000-8000-000000000003', 'portfolios/demo-vy/wedding-03.jpg', 5200000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-179, time '14:15:00'), pg_temp.lens_seed_at(-179, time '14:15:00')),
  ('e0000000-0000-4000-8000-000000000043', 'c0000000-0000-4000-8000-000000000004', 'portfolios/demo-linh/fashion-01.jpg', 4100000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-174, time '15:40:00'), pg_temp.lens_seed_at(-174, time '15:40:00')),
  ('e0000000-0000-4000-8000-000000000044', 'c0000000-0000-4000-8000-000000000004', 'portfolios/demo-linh/fashion-02.jpg', 4400000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-174, time '15:40:00'), pg_temp.lens_seed_at(-174, time '15:40:00')),
  ('e0000000-0000-4000-8000-000000000045', 'c0000000-0000-4000-8000-000000000004', 'portfolios/demo-linh/fashion-03.jpg', 4800000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-174, time '15:40:00'), pg_temp.lens_seed_at(-174, time '15:40:00')),
  ('e0000000-0000-4000-8000-000000000046', 'c0000000-0000-4000-8000-000000000005', 'portfolios/demo-thanh/event-01.jpg', 4500000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-158, time '11:20:00'), pg_temp.lens_seed_at(-158, time '11:20:00')),
  ('e0000000-0000-4000-8000-000000000047', 'c0000000-0000-4000-8000-000000000005', 'portfolios/demo-thanh/event-02.jpg', 4900000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-158, time '11:20:00'), pg_temp.lens_seed_at(-158, time '11:20:00')),
  ('e0000000-0000-4000-8000-000000000048', 'c0000000-0000-4000-8000-000000000005', 'portfolios/demo-thanh/event-03.jpg', 5300000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-158, time '11:20:00'), pg_temp.lens_seed_at(-158, time '11:20:00')),
  ('e0000000-0000-4000-8000-000000000049', 'c0000000-0000-4000-8000-000000000006', 'portfolios/demo-bao/product-01.jpg', 3600000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-149, time '16:10:00'), pg_temp.lens_seed_at(-149, time '16:10:00')),
  ('e0000000-0000-4000-8000-000000000050', 'c0000000-0000-4000-8000-000000000006', 'portfolios/demo-bao/product-02.jpg', 3900000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-149, time '16:10:00'), pg_temp.lens_seed_at(-149, time '16:10:00')),
  ('e0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-000000000006', 'portfolios/demo-bao/product-03.jpg', 4200000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-149, time '16:10:00'), pg_temp.lens_seed_at(-149, time '16:10:00')),
  ('e0000000-0000-4000-8000-000000000052', 'c0000000-0000-4000-8000-000000000007', 'portfolios/demo-trang/family-01.jpg', 3300000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-144, time '13:00:00'), pg_temp.lens_seed_at(-144, time '13:00:00')),
  ('e0000000-0000-4000-8000-000000000053', 'c0000000-0000-4000-8000-000000000007', 'portfolios/demo-trang/family-02.jpg', 3800000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-144, time '13:00:00'), pg_temp.lens_seed_at(-144, time '13:00:00')),
  ('e0000000-0000-4000-8000-000000000054', 'c0000000-0000-4000-8000-000000000007', 'portfolios/demo-trang/family-03.jpg', 4000000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-144, time '13:00:00'), pg_temp.lens_seed_at(-144, time '13:00:00')),

  -- Delivered product images
  ('e0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'deliveries/booking-001/final-retouched-01.jpg', 5500000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-81, time '09:40:00'), pg_temp.lens_seed_at(-81, time '09:40:00')),
  ('e0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000002', 'deliveries/booking-002/lookbook-master-01.jpg', 6200000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-55, time '10:55:00'), pg_temp.lens_seed_at(-55, time '10:55:00')),

  -- Evidence images for violation reports
  ('e0000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-000000000001', 'reports/evidence/screenshot-chat-delay.jpg', 850000, 'image/jpeg', 'ready', pg_temp.lens_seed_at(-82, time '09:50:00'), pg_temp.lens_seed_at(-82, time '09:50:00'))
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. PORTFOLIOS table (photographers' work collections)
-- ============================================================================
INSERT INTO portfolios (id, photographer_id, name, category, description, cover_media_id, items, created_at, updated_at)
VALUES
  ('f0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Hội An - Nắng Hoàng Hôn và Nàng Thơ', 'portrait', 'Bộ ảnh chân dung chụp vào buổi chiều tà rực rỡ bên dòng sông Hoài thơ mộng.', 'e0000000-0000-4000-8000-000000000001', '["e0000000-0000-4000-8000-000000000001", "e0000000-0000-4000-8000-000000000002", "e0000000-0000-4000-8000-000000000003"]'::jsonb, pg_temp.lens_seed_at(-215, time '10:00:00'), pg_temp.lens_seed_at(-215, time '10:00:00')),
  ('f0000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Sài Gòn Retro Lookbook Summer', 'fashion', 'Lookbook bộ sưu tập mùa hè đậm chất phóng khoáng, hiện đại trên đường phố Quận 1.', 'e0000000-0000-4000-8000-000000000004', '["e0000000-0000-4000-8000-000000000004", "e0000000-0000-4000-8000-000000000005"]'::jsonb, pg_temp.lens_seed_at(-205, time '15:00:00'), pg_temp.lens_seed_at(-205, time '15:00:00')),
  ('f0000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'Gia đình cuối tuần', 'family', 'Album minh họa cho buổi chụp gia đình ngoài trời với màu sắc sáng và tự nhiên.', 'e0000000-0000-4000-8000-000000000031', '["e0000000-0000-4000-8000-000000000031", "e0000000-0000-4000-8000-000000000032", "e0000000-0000-4000-8000-000000000033"]'::jsonb, pg_temp.lens_seed_at(-219, time '11:00:00'), pg_temp.lens_seed_at(-219, time '11:00:00')),
  ('f0000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'Phố lên đèn', 'street', 'Album minh họa phong cách streetwear và lifestyle với ánh sáng đô thị.', 'e0000000-0000-4000-8000-000000000034', '["e0000000-0000-4000-8000-000000000034", "e0000000-0000-4000-8000-000000000035", "e0000000-0000-4000-8000-000000000036"]'::jsonb, pg_temp.lens_seed_at(-208, time '16:45:00'), pg_temp.lens_seed_at(-208, time '16:45:00')),
  ('f0000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'Chân dung và tốt nghiệp', 'portrait', 'Album minh họa cho ảnh chân dung cá nhân và bộ ảnh tốt nghiệp ngoài trời.', 'e0000000-0000-4000-8000-000000000037', '["e0000000-0000-4000-8000-000000000037", "e0000000-0000-4000-8000-000000000038", "e0000000-0000-4000-8000-000000000039"]'::jsonb, pg_temp.lens_seed_at(-220, time '09:00:00'), pg_temp.lens_seed_at(-220, time '09:00:00')),
  ('f0000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', 'Khoảnh khắc ngày cưới', 'wedding', 'Album minh họa phong cách phóng sự cưới và ảnh đôi tại Huế.', 'e0000000-0000-4000-8000-000000000040', '["e0000000-0000-4000-8000-000000000040", "e0000000-0000-4000-8000-000000000041", "e0000000-0000-4000-8000-000000000042"]'::jsonb, pg_temp.lens_seed_at(-179, time '14:15:00'), pg_temp.lens_seed_at(-179, time '14:15:00')),
  ('f0000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000007', 'Thời trang và beauty', 'fashion', 'Album minh họa cho ảnh thời trang, beauty và chân dung studio.', 'e0000000-0000-4000-8000-000000000043', '["e0000000-0000-4000-8000-000000000043", "e0000000-0000-4000-8000-000000000044", "e0000000-0000-4000-8000-000000000045"]'::jsonb, pg_temp.lens_seed_at(-174, time '15:40:00'), pg_temp.lens_seed_at(-174, time '15:40:00')),
  ('f0000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000008', 'Sự kiện và sân khấu', 'event', 'Album minh họa cho ảnh sự kiện, hội nghị và chương trình biểu diễn.', 'e0000000-0000-4000-8000-000000000046', '["e0000000-0000-4000-8000-000000000046", "e0000000-0000-4000-8000-000000000047", "e0000000-0000-4000-8000-000000000048"]'::jsonb, pg_temp.lens_seed_at(-158, time '11:20:00'), pg_temp.lens_seed_at(-158, time '11:20:00')),
  ('f0000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000009', 'Món ăn và sản phẩm', 'product', 'Album minh họa ảnh sản phẩm và món ăn cho cửa hàng trực tuyến.', 'e0000000-0000-4000-8000-000000000049', '["e0000000-0000-4000-8000-000000000049", "e0000000-0000-4000-8000-000000000050", "e0000000-0000-4000-8000-000000000051"]'::jsonb, pg_temp.lens_seed_at(-149, time '16:10:00'), pg_temp.lens_seed_at(-149, time '16:10:00')),
  ('f0000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000010', 'Gia đình giữa thiên nhiên', 'family', 'Album minh họa buổi chụp gia đình và du lịch ngoại cảnh tại Đà Lạt.', 'e0000000-0000-4000-8000-000000000052', '["e0000000-0000-4000-8000-000000000052", "e0000000-0000-4000-8000-000000000053", "e0000000-0000-4000-8000-000000000054"]'::jsonb, pg_temp.lens_seed_at(-144, time '13:00:00'), pg_temp.lens_seed_at(-144, time '13:00:00'))
ON CONFLICT (id) DO UPDATE SET
  photographer_id = EXCLUDED.photographer_id,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  cover_media_id = EXCLUDED.cover_media_id,
  items = EXCLUDED.items,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 13. BOOKINGS table (sample history relative to the seed run)
-- ============================================================================
INSERT INTO bookings (id, customer_id, photographer_id, booking_plan_id, location, "from", "to", deposit_amount, total_amount, status, gallery_published_at, accepted_at, created_at, updated_at)
VALUES
  -- Booking 1: completed and photos delivered (seed-relative history)
  ('d0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Chùa Cầu & Sông Hoài, Phố cổ Hội An', pg_temp.lens_seed_at(-83, time '15:30:00'), pg_temp.lens_seed_at(-83, time '17:00:00'), 300000, 1000000, 'completed', pg_temp.lens_seed_at(-81, time '10:00:00'), pg_temp.lens_seed_at(-93, time '12:00:00'), pg_temp.lens_seed_at(-93, time '10:00:00'), pg_temp.lens_seed_at(-81, time '10:00:00')),

  -- Booking 2: shoot completed; photo delivery in progress (seed-relative history)
  ('d0000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', 'Studio Quận 1 & Bưu điện Trung tâm TP.HCM', pg_temp.lens_seed_at(-57, time '09:00:00'), pg_temp.lens_seed_at(-57, time '12:00:00'), 900000, 3000000, 'shot', NULL, pg_temp.lens_seed_at(-66, time '18:00:00'), pg_temp.lens_seed_at(-66, time '14:00:00'), pg_temp.lens_seed_at(-57, time '12:30:00')),

  -- Booking 3: photographer accepted an upcoming booking (two weeks after the seed run)
  ('d0000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000005', 'Công viên Thống Nhất & Hồ Gươm, Hà Nội', ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + time '09:00') AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '14 days', ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + time '09:00') AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '14 days' + interval '90 minutes', 450000, 1500000, 'accepted', NULL, now() - interval '4 days', now() - interval '5 days', now() - interval '4 days'),

  -- Booking 4: customer cancelled a future shoot and requested a deposit refund
  ('d0000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000007', 'Phố sách Đinh Lễ & Phố đi bộ Hồ Gươm', ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + time '14:00') AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '8 days', ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + time '14:00') AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '8 days' + interval '60 minutes', 240000, 800000, 'cancelled', NULL, now() - interval '3 hours', now() - interval '4 hours', now() - interval '1 hour')
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  "from" = EXCLUDED."from",
  "to" = EXCLUDED."to",
  status = EXCLUDED.status,
  accepted_at = EXCLUDED.accepted_at,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at
WHERE bookings.id IN (
  'd0000000-0000-4000-8000-000000000003'::uuid,
  'd0000000-0000-4000-8000-000000000004'::uuid
);

-- Completed bookings get an escrow settlement. The first fixture records a
-- previously approved 24-hour extension and a successfully processed payout.
INSERT INTO payment_escrow_settlements (
  id, booking_id, release_at, refund_request_deadline_at,
  release_processed_at, created_at, updated_at
)
SELECT
  '19000000-0000-4000-8000-000000000001'::uuid,
  booking.id,
  booking.updated_at + interval '96 hours',
  booking.updated_at + interval '72 hours',
  now(),
  booking.updated_at,
  now()
FROM bookings AS booking
WHERE booking.id = 'd0000000-0000-4000-8000-000000000001'::uuid
  AND booking.status = 'completed'
ON CONFLICT (booking_id) DO UPDATE SET
  release_at = EXCLUDED.release_at,
  refund_request_deadline_at = EXCLUDED.refund_request_deadline_at,
  release_processed_at = EXCLUDED.release_processed_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO payment_escrow_extensions (
  id, settlement_id, extended_by, previous_release_at, new_release_at,
  extension_hours, reason, created_at, updated_at
)
SELECT
  '19000000-0000-4000-8000-000000000002'::uuid,
  settlement.id,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  booking.updated_at + interval '72 hours',
  booking.updated_at + interval '96 hours',
  24,
  'Gia hạn thời gian đối soát cho bộ dữ liệu demo trước khi giải ngân.',
  booking.updated_at + interval '60 hours',
  booking.updated_at + interval '60 hours'
FROM payment_escrow_settlements AS settlement
JOIN bookings AS booking ON booking.id = settlement.booking_id
WHERE booking.id = 'd0000000-0000-4000-8000-000000000001'::uuid
ON CONFLICT (id) DO UPDATE SET
  settlement_id = EXCLUDED.settlement_id,
  extended_by = EXCLUDED.extended_by,
  previous_release_at = EXCLUDED.previous_release_at,
  new_release_at = EXCLUDED.new_release_at,
  extension_hours = EXCLUDED.extension_hours,
  reason = EXCLUDED.reason,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- Status history for the four bookings above. Insert only when a booking has no history yet. The actor is the party who performed the action; use the booking's customer or photographer as the user.
INSERT INTO booking_status_history (id, booking_id, from_status, to_status, actor_role, actor_user_id, reason, created_at, updated_at)
SELECT h.id::uuid, b.id, h.from_status, h.to_status, h.actor_role,
  CASE h.actor_role WHEN 'customer' THEN c.user_id WHEN 'photographer' THEN p.user_id END,
  h.reason, h.at::timestamptz, h.at::timestamptz
FROM (VALUES
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', NULL, 'pending', 'customer', NULL, pg_temp.lens_seed_at(-93, time '10:00:00')),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'pending', 'accepted', 'photographer', NULL, pg_temp.lens_seed_at(-93, time '12:00:00')),
  ('d1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'accepted', 'in_progress', 'photographer', NULL, pg_temp.lens_seed_at(-83, time '15:30:00')),
  ('d1000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'in_progress', 'shot', 'photographer', NULL, pg_temp.lens_seed_at(-83, time '17:00:00')),
  ('d1000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'shot', 'completed', 'customer', NULL, pg_temp.lens_seed_at(-81, time '10:00:00')),
  ('d1000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002', NULL, 'pending', 'customer', NULL, pg_temp.lens_seed_at(-66, time '14:00:00')),
  ('d1000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000002', 'pending', 'accepted', 'photographer', NULL, pg_temp.lens_seed_at(-66, time '18:00:00')),
  ('d1000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000002', 'accepted', 'in_progress', 'photographer', NULL, pg_temp.lens_seed_at(-57, time '09:00:00')),
  ('d1000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000002', 'in_progress', 'shot', 'photographer', NULL, pg_temp.lens_seed_at(-57, time '12:30:00')),
  ('d1000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000003', NULL, 'pending', 'customer', NULL, now() - interval '5 days'),
  ('d1000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000003', 'pending', 'accepted', 'photographer', NULL, now() - interval '4 days'),
  ('d1000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000004', NULL, 'pending', 'customer', NULL, now() - interval '4 hours'),
  ('d1000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000004', 'pending', 'accepted', 'photographer', NULL, now() - interval '3 hours'),
  ('d1000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000004', 'accepted', 'cancelled', 'customer', 'Gia đình có việc đột xuất, xin huỷ lịch', now() - interval '1 hour')
) AS h(id, booking_id, from_status, to_status, actor_role, reason, at)
JOIN bookings b ON b.id = h.booking_id::uuid
JOIN customers c ON c.id = b.customer_id
JOIN photographers p ON p.id = b.photographer_id
-- If a booking already exists, migration 009 has recorded its history; do not insert duplicate rows.
WHERE NOT EXISTS (
  SELECT 1 FROM booking_status_history x
  WHERE x.booking_id = b.id AND x.id <> h.id::uuid
)
OR EXISTS (
  SELECT 1 FROM booking_status_history x
  WHERE x.booking_id = b.id AND x.id = h.id::uuid
)
ON CONFLICT (id) DO UPDATE SET
  from_status = EXCLUDED.from_status,
  to_status = EXCLUDED.to_status,
  actor_role = EXCLUDED.actor_role,
  actor_user_id = EXCLUDED.actor_user_id,
  reason = EXCLUDED.reason,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 14. TRANSACTIONS table (financial transactions relative to the seed run)
-- ============================================================================
INSERT INTO transactions (id, user_id, transaction_code, type, reference_id, direction, amount, currency, description, status, payment_gateway, provider_order_code, checkout_url, idempotency_key, created_at, updated_at)
VALUES
  -- Booking 1 deposit payment (VND 300,000)
  ('11000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'DEP-BK001-SEED', 'deposit', 'd0000000-0000-4000-8000-000000000001', 'in', 300000, 'VND', 'Thanh toán đặt cọc 30% cho đơn chụp ảnh Hội An', 'paid', 'payos', 100001, 'https://pay.payos.vn/web/100001', 'idemp-dep-bk001', pg_temp.lens_seed_at(-93, time '10:05:00'), pg_temp.lens_seed_at(-93, time '10:08:00')),

  -- Remaining 70% payment for Booking 1 (VND 700,000)
  ('11000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'REM-BK001-SEED', 'remaining', 'd0000000-0000-4000-8000-000000000001', 'in', 700000, 'VND', 'Thanh toán số tiền 70% còn lại sau khi nhận ảnh', 'paid', 'payos', 100002, 'https://pay.payos.vn/web/100002', 'idemp-rem-bk001', pg_temp.lens_seed_at(-81, time '10:15:00'), pg_temp.lens_seed_at(-81, time '10:18:00')),

  -- Booking 2 deposit payment (VND 900,000)
  ('11000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', 'DEP-BK002-SEED', 'deposit', 'd0000000-0000-4000-8000-000000000002', 'in', 900000, 'VND', 'Thanh toán đặt cọc 30% cho gói Lookbook thời trang', 'paid', 'payos', 100003, 'https://pay.payos.vn/web/100003', 'idemp-dep-bk002', pg_temp.lens_seed_at(-66, time '14:05:00'), pg_temp.lens_seed_at(-66, time '14:07:00')),

  -- Booking 3 deposit payment (VND 450,000)
  ('11000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'DEP-BK003-SEED', 'deposit', 'd0000000-0000-4000-8000-000000000003', 'in', 450000, 'VND', 'Thanh toán đặt cọc 30% cho gói chụp gia đình ngoại cảnh', 'paid', 'payos', 100004, 'https://pay.payos.vn/web/100004', 'idemp-dep-bk003', now() - interval '4 days' + interval '5 minutes', now() - interval '4 days' + interval '8 minutes'),

  -- Booking 4 deposit payment (VND 240,000; cancelled)
  ('11000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'DEP-BK004-SEED', 'deposit', 'd0000000-0000-4000-8000-000000000004', 'in', 240000, 'VND', 'Thanh toán đặt cọc gói chụp đường phố', 'paid', 'payos', 100005, 'https://pay.payos.vn/web/100005', 'idemp-dep-bk004', now() - interval '3 hours' + interval '5 minutes', now() - interval '3 hours' + interval '8 minutes'),

  -- Photographer Huy's membership purchase (VND 1,799,000)
  ('11000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'SUB-HUY-SEED', 'subscription', '70000000-0000-4000-8000-000000000001', 'in', 1799000, 'VND', 'Thanh toán gói hội viên Doanh nghiệp 1 năm', 'paid', 'payos', 100011, 'https://pay.payos.vn/web/100011', 'idemp-sub-huy-01', now() - interval '30 days' + interval '5 minutes', now() - interval '30 days' + interval '8 minutes')
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  transaction_code = EXCLUDED.transaction_code,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at
WHERE transactions.id IN (
  '11000000-0000-4000-8000-000000000004'::uuid,
  '11000000-0000-4000-8000-000000000005'::uuid,
  '11000000-0000-4000-8000-000000000011'::uuid
);

-- Seed the current wallet snapshots plus transaction-linked booking escrow.
WITH paid_booking_transactions AS (
  SELECT
    w.id AS wallet_id,
    t.id AS transaction_id,
    t.amount,
    b.id AS booking_id,
    b.status AS booking_status
  FROM transactions t
  JOIN bookings b ON b.id = t.reference_id
  JOIN photographers p ON p.id = b.photographer_id
  JOIN wallets w ON w.user_id = p.user_id
  WHERE t.type IN ('deposit', 'remaining') AND t.status = 'paid'
), wallet_totals AS (
  SELECT
    wallet_id,
    COALESCE(SUM(amount) FILTER (WHERE booking_status = 'completed'), 0) AS released_amount,
    COALESCE(SUM(amount) FILTER (WHERE booking_status <> 'completed'), 0) AS held_amount
  FROM paid_booking_transactions
  GROUP BY wallet_id
), entries AS (
  SELECT
    wallet_id,
    transaction_id,
    'booking_escrow_hold'::text AS entry_type,
    0::bigint AS available_delta,
    amount AS frozen_delta,
    'booking-escrow-hold:' || transaction_id::text AS idempotency_key,
    'Seeded booking payment held in photographer escrow'::text AS description
  FROM paid_booking_transactions

  UNION ALL

  SELECT
    wallet_id,
    transaction_id,
    'booking_escrow_release'::text,
    amount,
    -amount,
    'booking-escrow-release:booking-completed:' || booking_id::text || ':' || transaction_id::text,
    'Seeded booking escrow released after completion'::text
  FROM paid_booking_transactions
  WHERE booking_status = 'completed'

  UNION ALL

  SELECT
    w.id,
    NULL::uuid,
    'opening_balance'::text,
    w.balance - COALESCE(totals.released_amount, 0),
    w.frozen_balance - COALESCE(totals.held_amount, 0),
    'migration-wallet-opening:' || w.id::text,
    'Seed wallet opening balance after booking escrow entries'::text
  FROM wallets w
  LEFT JOIN wallet_totals totals ON totals.wallet_id = w.id
)
INSERT INTO wallet_ledger (
  wallet_id,
  transaction_id,
  entry_type,
  available_delta,
  frozen_delta,
  idempotency_key,
  description
)
SELECT
  entry.wallet_id,
  entry.transaction_id,
  entry.entry_type,
  entry.available_delta,
  entry.frozen_delta,
  entry.idempotency_key,
  entry.description
FROM entries entry
WHERE (entry.available_delta <> 0 OR entry.frozen_delta <> 0)
  AND NOT EXISTS (
    SELECT 1 FROM wallet_ledger existing
    WHERE existing.wallet_id = entry.wallet_id
  )
ON CONFLICT (idempotency_key) DO NOTHING;

-- ============================================================================
-- 15. PAYMENT_WEBHOOKS table (successful payment confirmations from PayOS)
-- ============================================================================
INSERT INTO payment_webhooks (id, provider, reference, transaction_id, created_at, updated_at)
VALUES
  ('12000000-0000-4000-8000-000000000001', 'payos', 'PAYOS-REF-100001-SUCCESS', '11000000-0000-4000-8000-000000000001', pg_temp.lens_seed_at(-93, time '10:08:01'), pg_temp.lens_seed_at(-93, time '10:08:01')),
  ('12000000-0000-4000-8000-000000000002', 'payos', 'PAYOS-REF-100002-SUCCESS', '11000000-0000-4000-8000-000000000002', pg_temp.lens_seed_at(-81, time '10:18:02'), pg_temp.lens_seed_at(-81, time '10:18:02')),
  ('12000000-0000-4000-8000-000000000003', 'payos', 'PAYOS-REF-100003-SUCCESS', '11000000-0000-4000-8000-000000000003', pg_temp.lens_seed_at(-66, time '14:07:05'), pg_temp.lens_seed_at(-66, time '14:07:05')),
  ('12000000-0000-4000-8000-000000000004', 'payos', 'PAYOS-REF-100004-SUCCESS', '11000000-0000-4000-8000-000000000004', now() - interval '4 days' + interval '8 minutes', now() - interval '4 days' + interval '8 minutes'),
  ('12000000-0000-4000-8000-000000000005', 'payos', 'PAYOS-REF-100005-SUCCESS', '11000000-0000-4000-8000-000000000005', now() - interval '3 hours' + interval '8 minutes', now() - interval '3 hours' + interval '8 minutes'),
  ('12000000-0000-4000-8000-000000000011', 'payos', 'PAYOS-REF-100011-SUCCESS', '11000000-0000-4000-8000-000000000011', now() - interval '30 days' + interval '8 minutes', now() - interval '30 days' + interval '8 minutes')
ON CONFLICT (id) DO UPDATE SET
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at
WHERE payment_webhooks.id IN (
  '12000000-0000-4000-8000-000000000004'::uuid,
  '12000000-0000-4000-8000-000000000005'::uuid,
  '12000000-0000-4000-8000-000000000011'::uuid
);

-- ============================================================================
-- 16. REFUND_REQUESTS table (booking-level refunds for cancellations)
-- ============================================================================
INSERT INTO refund_requests (id, request_type, transaction_id, booking_id, wallet_id, user_id, requested_by, amount, reason, status, processing_due_at, sla_reminded_at, sla_escalated_at, deadline_extension_count, created_at, updated_at)
VALUES
  ('13000000-0000-4000-8000-000000000001', 'booking_cancellation', NULL, 'd0000000-0000-4000-8000-000000000004', NULL, 'c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 240000, 'Gia đình có việc đột xuất, khách xin hoàn cọc sau khi hủy lịch.', 'requested', now() + interval '23 hours', NULL, NULL, 0, now() - interval '1 hour', now() - interval '1 hour')
ON CONFLICT (id) DO UPDATE SET
  booking_id = EXCLUDED.booking_id,
  user_id = EXCLUDED.user_id,
  requested_by = EXCLUDED.requested_by,
  amount = EXCLUDED.amount,
  reason = EXCLUDED.reason,
  status = EXCLUDED.status,
  processing_due_at = EXCLUDED.processing_due_at,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- Normalize earlier seed runs and link the booking request to its source payment.
UPDATE refund_requests
SET transaction_id = NULL
WHERE id = '13000000-0000-4000-8000-000000000001';

INSERT INTO refund_request_allocations (
  refund_request_id,
  transaction_id,
  amount,
  created_at,
  updated_at
)
VALUES (
  '13000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000005',
  240000,
  now() - interval '1 hour',
  now() - interval '1 hour'
)
ON CONFLICT (refund_request_id, transaction_id) DO UPDATE SET
  amount = EXCLUDED.amount,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

UPDATE refund_requests
SET processing_due_at = now() + interval '47 hours',
    deadline_extension_count = 1,
    updated_at = now()
WHERE id = '13000000-0000-4000-8000-000000000001'::uuid;

INSERT INTO payment_request_deadline_extensions (
  id, refund_request_id, extended_by, previous_due_at, new_due_at,
  extension_hours, reason, created_at, updated_at
)
VALUES (
  '19000000-0000-4000-8000-000000000003',
  '13000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  now() + interval '23 hours',
  now() + interval '47 hours',
  24,
  'Bổ sung thời gian xác minh yêu cầu hoàn tiền trong bộ dữ liệu demo.',
  now() - interval '5 minutes',
  now() - interval '5 minutes'
)
ON CONFLICT (id) DO UPDATE SET
  refund_request_id = EXCLUDED.refund_request_id,
  extended_by = EXCLUDED.extended_by,
  previous_due_at = EXCLUDED.previous_due_at,
  new_due_at = EXCLUDED.new_due_at,
  extension_hours = EXCLUDED.extension_hours,
  reason = EXCLUDED.reason,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 17. BOOKING_DELIVERIES table (photo album deliveries to customers)
-- ============================================================================
INSERT INTO booking_deliveries (id, booking_id, title, media_ids, created_at, updated_at)
VALUES
  ('14000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Album hoàn thiện - Nàng thơ Hội An', '["e0000000-0000-4000-8000-000000000011"]'::jsonb, pg_temp.lens_seed_at(-81, time '09:45:00'), pg_temp.lens_seed_at(-81, time '09:45:00')),
  ('14000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'Bàn giao file gốc Lookbook Local Brand', '["e0000000-0000-4000-8000-000000000012"]'::jsonb, pg_temp.lens_seed_at(-55, time '11:00:00'), pg_temp.lens_seed_at(-55, time '11:00:00'))
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 18. FEEDBACKS table (sample customer reviews and photographer replies)
-- ============================================================================
INSERT INTO feedbacks (id, booking_id, customer_id, photographer_id, rating, punctuality_rating, attitude_rating, comment, is_edited, status, photographer_reply, replied_at, created_at, updated_at)
VALUES
  ('15000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 5, 5, 5, 'Anh Huy chụp siêu có tâm, nhiệt tình chỉ cách tạo dáng cho hai đứa từ đầu đến cuối. Nước màu ảnh rất trong trẻo, giao ảnh đúng hẹn!', false, 'visible', 'Cảm ơn Mai Anh và bạn đã tin tưởng dịch vụ của Huy nhé. Chúc hai bạn luôn ngập tràn niềm vui!', pg_temp.lens_seed_at(-80, time '08:30:00'), pg_temp.lens_seed_at(-81, time '20:00:00'), pg_temp.lens_seed_at(-80, time '08:30:00'))
ON CONFLICT (id) DO NOTHING;

-- Recalculate photographer ratings from the bookings and reviews above (using the same logic as the app), so ranks and
-- badges stay consistent when a booking is completed or a new review is added.
UPDATE photographer_ratings r
SET average_rating = COALESCE((SELECT AVG(f.rating) FROM feedbacks f
                               WHERE f.photographer_id = r.photographer_id AND f.status = 'visible'), 0),
    total_feedbacks = (SELECT COUNT(*) FROM feedbacks f
                       WHERE f.photographer_id = r.photographer_id AND f.status = 'visible'),
    total_bookings = (SELECT COUNT(*) FROM bookings b
                      WHERE b.photographer_id = r.photographer_id AND b.status = 'completed'),
    return_customers = (SELECT COUNT(*) FROM (SELECT b.customer_id FROM bookings b
                                              WHERE b.photographer_id = r.photographer_id AND b.status = 'completed'
                                              GROUP BY b.customer_id HAVING COUNT(*) > 1) returning_customers);

INSERT INTO photographer_badges (
  id, photographer_id, code, earned_at, created_at, updated_at
)
VALUES
  ('19000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000001', 'top-rated', pg_temp.lens_seed_at(-80, time '08:30:00'), pg_temp.lens_seed_at(-80, time '08:30:00'), pg_temp.lens_seed_at(-80, time '08:30:00')),
  ('19000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000001', 'punctual', pg_temp.lens_seed_at(-80, time '08:30:00'), pg_temp.lens_seed_at(-80, time '08:30:00'), pg_temp.lens_seed_at(-80, time '08:30:00'))
ON CONFLICT (photographer_id, code) DO UPDATE SET
  earned_at = EXCLUDED.earned_at,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 19. REPORTS table (customer reports and disputes handled by administrators)
-- ============================================================================
INSERT INTO reports (id, user_id, target_type, target_id, reason, status, resolution, resolved_by, created_at, updated_at)
VALUES
  ('16000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'booking', 'd0000000-0000-4000-8000-000000000001', 'Khách hàng phản ánh thợ ảnh phản hồi tin nhắn chậm 1 ngày trong quá trình chọn ảnh chỉnh sửa.', 'resolved', 'Admin đã liên hệ thợ ảnh xác minh. Thợ ảnh gửi lời xin lỗi và đã bàn giao ảnh đúng hạn kèm tặng thêm 3 ảnh blend màu.', 'a0000000-0000-4000-8000-000000000001', pg_temp.lens_seed_at(-82, time '10:00:00'), pg_temp.lens_seed_at(-82, time '15:30:00'))
ON CONFLICT (id) DO NOTHING;

INSERT INTO report_evidences (id, report_id, media_id, sort_order, created_at, updated_at)
VALUES
  ('18000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000021', 0, pg_temp.lens_seed_at(-82, time '10:00:00'), pg_temp.lens_seed_at(-82, time '10:00:00'))
ON CONFLICT (report_id, media_id) DO NOTHING;

INSERT INTO report_status_history (id, report_id, event_type, from_status, to_status, actor_user_id, actor_role, note, created_at, updated_at)
VALUES
  ('18000000-0000-4000-8000-000000000011', '16000000-0000-4000-8000-000000000001', 'created', NULL, 'open', 'c0000000-0000-4000-8000-000000000001', 'user', NULL, pg_temp.lens_seed_at(-82, time '10:00:00'), pg_temp.lens_seed_at(-82, time '10:00:00')),
  ('18000000-0000-4000-8000-000000000012', '16000000-0000-4000-8000-000000000001', 'status_changed', 'open', 'resolved', 'a0000000-0000-4000-8000-000000000001', 'admin', 'Admin đã liên hệ thợ ảnh xác minh. Thợ ảnh gửi lời xin lỗi và đã bàn giao ảnh đúng hạn kèm tặng thêm 3 ảnh blend màu.', pg_temp.lens_seed_at(-82, time '15:30:00'), pg_temp.lens_seed_at(-82, time '15:30:00'))
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 20. OUTBOX_EVENTS table (real-time notification events dispatched through Socket.IO)
-- ============================================================================
INSERT INTO outbox_events (id, topic, recipient_ids, payload, processed_at, created_at, updated_at)
VALUES
  ('17000000-0000-4000-8000-000000000001', 'booking.completed', '["c0000000-0000-4000-8000-000000000001", "b0000000-0000-4000-8000-000000000001"]'::jsonb, '{"booking_id": "d0000000-0000-4000-8000-000000000001", "status": "completed", "message": "Đơn đặt lịch chụp ảnh tại Hội An đã hoàn thành thành công."}'::jsonb, pg_temp.lens_seed_at(-81, time '10:00:05'), pg_temp.lens_seed_at(-81, time '10:00:00'), pg_temp.lens_seed_at(-81, time '10:00:05')),
  ('17000000-0000-4000-8000-000000000002', 'payment.success', '["c0000000-0000-4000-8000-000000000001"]'::jsonb, '{"transaction_id": "11000000-0000-4000-8000-000000000001", "amount": 300000, "message": "Thanh toán đặt cọc 300.000 VND thành công qua PayOS."}'::jsonb, pg_temp.lens_seed_at(-93, time '10:08:02'), pg_temp.lens_seed_at(-93, time '10:08:00'), pg_temp.lens_seed_at(-93, time '10:08:02')),
  ('17000000-0000-4000-8000-000000000003', 'booking.accepted', '["c0000000-0000-4000-8000-000000000001"]'::jsonb, '{"booking_id": "d0000000-0000-4000-8000-000000000003", "status": "accepted", "message": "Nhiếp ảnh gia Đỗ Thu Thảo đã chấp nhận yêu cầu đặt lịch của bạn."}'::jsonb, now() - interval '4 days' + interval '5 seconds', now() - interval '4 days', now() - interval '4 days' + interval '5 seconds')
ON CONFLICT (id) DO UPDATE SET
  recipient_ids = EXCLUDED.recipient_ids,
  payload = EXCLUDED.payload,
  processed_at = EXCLUDED.processed_at,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at
WHERE outbox_events.id = '17000000-0000-4000-8000-000000000003'::uuid;

COMMIT;
