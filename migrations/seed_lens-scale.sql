-- Deterministic volume fixtures for local development and database load profiling.
-- scripts/seed.mjs sets the three lens.seed.* values and runs this file in a transaction.
-- Synthetic users use the reserved .invalid domain and are intentionally not provisioned in Keycloak.

CREATE TEMP TABLE lens_seed_settings ON COMMIT DROP AS
SELECT
  current_setting('lens.seed.photographers')::integer AS photographer_count,
  current_setting('lens.seed.customers')::integer AS customer_count,
  current_setting('lens.seed.bookings')::integer AS booking_count;

CREATE OR REPLACE FUNCTION pg_temp.lens_seed_uuid(p_namespace text, p_key text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $seed_uuid$
  SELECT (
    substr(hash, 1, 8) || '-' ||
    substr(hash, 9, 4) || '-4' ||
    substr(hash, 14, 3) || '-8' ||
    substr(hash, 18, 3) || '-' ||
    substr(hash, 21, 12)
  )::uuid
  FROM (SELECT md5(p_namespace || ':' || p_key) AS hash) AS digest
$seed_uuid$;

-- Compose repeatable, Vietnamese-sounding fictional names instead of exposing row numbers as names.
CREATE OR REPLACE FUNCTION pg_temp.lens_seed_name(p_idx integer, p_gender text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $seed_name$
  WITH name_parts AS (
    SELECT
      ARRAY[
        'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
        'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Trịnh', 'Mai', 'Lâm',
        'Cao', 'Tạ', 'Châu', 'Tô', 'Quách', 'Hà', 'La', 'Tăng', 'Trương', 'Đào',
        'Lưu', 'Thái', 'Phùng', 'Vương', 'Bạch', 'Đàm', 'Mạc', 'Kiều', 'Tôn', 'Chu',
        'Từ', 'Âu', 'Ninh', 'Tống', 'Hứa', 'Diệp', 'Lương', 'Phó', 'Tất', 'Cù'
      ]::text[] AS surnames,
      CASE p_gender
        WHEN 'male' THEN ARRAY[
          'Văn', 'Đức', 'Minh', 'Quốc', 'Hữu', 'Gia', 'Công', 'Xuân', 'Hoàng', 'Anh',
          'Tuấn', 'Thành', 'Trọng', 'Khắc', 'Bảo', 'Thanh', 'Duy', 'Phúc', 'Ngọc', 'Quang'
        ]::text[]
        WHEN 'female' THEN ARRAY[
          'Thị', 'Ngọc', 'Thu', 'Phương', 'Mỹ', 'Thanh', 'Kim', 'Diệu', 'Hà', 'Khánh',
          'Mai', 'Quỳnh', 'Nhã', 'Thùy', 'Hoài', 'Ánh', 'Kiều', 'Gia', 'Tường', 'Bảo'
        ]::text[]
        ELSE ARRAY[
          'Minh', 'Gia', 'Bảo', 'Khánh', 'Ngọc', 'Thanh', 'An', 'Trúc', 'Tú', 'Quỳnh',
          'Hoài', 'Kim', 'Hà', 'Thiên', 'Nhật', 'Xuân', 'Đăng', 'Tâm', 'Phương', 'Ái'
        ]::text[]
      END AS middle_names,
      CASE p_gender
        WHEN 'male' THEN ARRAY[
          'An', 'Bình', 'Bảo', 'Cường', 'Duy', 'Đạt', 'Đức', 'Hải', 'Hưng', 'Huy',
          'Khang', 'Khánh', 'Kiên', 'Lâm', 'Long', 'Minh', 'Nam', 'Phong', 'Quân', 'Sơn',
          'Thành', 'Thiện', 'Thịnh', 'Trí', 'Tuấn', 'Việt', 'Vinh', 'Quang', 'Tùng', 'Dũng',
          'Hoàng', 'Khôi', 'Phúc', 'Toàn', 'Trung', 'Tài', 'Tâm', 'Khoa', 'Nguyên', 'Mạnh'
        ]::text[]
        WHEN 'female' THEN ARRAY[
          'Anh', 'Bích', 'Chi', 'Diệp', 'Hà', 'Hạnh', 'Hân', 'Hoa', 'Huyền', 'Khánh',
          'Lan', 'Linh', 'Mai', 'My', 'Ngân', 'Ngọc', 'Nhung', 'Nhi', 'Oanh', 'Phương',
          'Quỳnh', 'Thảo', 'Thu', 'Thư', 'Trang', 'Trâm', 'Uyên', 'Vy', 'Yến', 'Ánh',
          'Tú', 'Giang', 'Xuân', 'An', 'Đan', 'Tiên', 'Vân', 'Di', 'Dung', 'Tâm'
        ]::text[]
        ELSE ARRAY[
          'An', 'Bình', 'Châu', 'Dương', 'Giang', 'Hà', 'Khánh', 'Lam', 'Linh', 'Minh',
          'Ngân', 'Ngọc', 'Nhã', 'Phương', 'Quỳnh', 'Sơn', 'Thanh', 'Thiên', 'Tú', 'Vy',
          'Xuân', 'Yên', 'Bảo', 'Trúc', 'Tâm', 'Hải', 'Thư', 'Đan', 'Mai', 'Thu'
        ]::text[]
      END AS given_names
  )
  SELECT
    surnames[((p_idx * 7 - 1) % cardinality(surnames)) + 1] || ' ' ||
    middle_names[(((p_idx - 1) / 3) % cardinality(middle_names)) + 1] || ' ' ||
    given_names[(((p_idx - 1) / 7) % cardinality(given_names)) + 1]
  FROM name_parts
$seed_name$;

-- Replace the previous generated fixture set on each run. These reserved addresses
-- identify only records owned by this scale seeder, including the earlier hyphenated format.
CREATE TEMP TABLE lens_seed_old_users ON COMMIT DROP AS
SELECT id FROM users
WHERE email LIKE 'photographer.%@seed.invalid'
   OR email LIKE 'customer.%@seed.invalid'
   OR email LIKE 'photographer-%@seed.invalid'
   OR email LIKE 'customer-%@seed.invalid';
CREATE UNIQUE INDEX ON lens_seed_old_users (id);

CREATE TEMP TABLE lens_seed_old_photographers ON COMMIT DROP AS
SELECT photographer.id
FROM photographers AS photographer
JOIN lens_seed_old_users AS account ON account.id = photographer.user_id;
CREATE UNIQUE INDEX ON lens_seed_old_photographers (id);

CREATE TEMP TABLE lens_seed_old_customers ON COMMIT DROP AS
SELECT customer.id
FROM customers AS customer
JOIN lens_seed_old_users AS account ON account.id = customer.user_id;
CREATE UNIQUE INDEX ON lens_seed_old_customers (id);

CREATE TEMP TABLE lens_seed_old_bookings ON COMMIT DROP AS
SELECT booking.id
FROM bookings AS booking
WHERE booking.photographer_id IN (SELECT id FROM lens_seed_old_photographers)
   OR booking.customer_id IN (SELECT id FROM lens_seed_old_customers);
CREATE UNIQUE INDEX ON lens_seed_old_bookings (id);

DELETE FROM booking_status_history AS history
USING lens_seed_old_bookings AS seeded
WHERE history.booking_id = seeded.id;

DELETE FROM booking_deliveries AS delivery
USING lens_seed_old_bookings AS seeded
WHERE delivery.booking_id = seeded.id;

DELETE FROM feedbacks AS feedback
USING lens_seed_old_bookings AS seeded
WHERE feedback.booking_id = seeded.id;

DELETE FROM bookings AS booking
USING lens_seed_old_bookings AS seeded
WHERE booking.id = seeded.id;

DELETE FROM offline_slots AS slot
USING lens_seed_old_photographers AS seeded
WHERE slot.photographer_id = seeded.id;

DELETE FROM portfolios AS portfolio
USING lens_seed_old_photographers AS seeded
WHERE portfolio.photographer_id = seeded.id;

DELETE FROM photographer_ratings AS rating
USING lens_seed_old_photographers AS seeded
WHERE rating.photographer_id = seeded.id;

DELETE FROM booking_plans AS plan
USING lens_seed_old_photographers AS seeded
WHERE plan.photographer_id = seeded.id;

DELETE FROM wallets AS wallet
USING lens_seed_old_users AS seeded
WHERE wallet.user_id = seeded.id;

-- Generated stock media is recreated by scripts/seed-media.mjs on every run.
-- Remove its DB rows before deleting the previous generated users.
DELETE FROM media_variants AS variant
USING media AS file, lens_seed_old_users AS seeded
WHERE variant.media_id = file.id
  AND file.user_id = seeded.id
  AND file.file_key LIKE 'public/demo-stock/scale/%';

DELETE FROM media AS file
USING lens_seed_old_users AS seeded
WHERE file.user_id = seeded.id
  AND file.file_key LIKE 'public/demo-stock/scale/%';

DELETE FROM photographers AS photographer
USING lens_seed_old_photographers AS seeded
WHERE photographer.id = seeded.id;

DELETE FROM customers AS customer
USING lens_seed_old_customers AS seeded
WHERE customer.id = seeded.id;

DELETE FROM users AS account
USING lens_seed_old_users AS seeded
WHERE account.id = seeded.id;

CREATE TEMP TABLE lens_seed_photographers ON COMMIT DROP AS
SELECT
  series.idx::integer AS idx,
  pg_temp.lens_seed_uuid('photographer', series.idx::text) AS id,
  pg_temp.lens_seed_uuid('photographer-user', series.idx::text) AS user_id,
  pg_temp.lens_seed_uuid('photographer-keycloak', series.idx::text)::text AS keycloak_id,
  profile.gender,
  pg_temp.lens_seed_name(series.idx, profile.gender) AS fullname,
  format('photographer.%s@seed.invalid', lpad(series.idx::text, 6, '0')) AS email,
  '+8491' || lpad(series.idx::text, 8, '0') AS phone_number,
  (now() - ((series.idx % 365) * interval '1 day')) AS created_at
FROM lens_seed_settings AS settings
CROSS JOIN LATERAL generate_series(1, settings.photographer_count) AS series(idx)
CROSS JOIN LATERAL (
  SELECT CASE WHEN series.idx % 10 < 5 THEN 'female'
    WHEN series.idx % 10 < 9 THEN 'male' ELSE 'other' END AS gender
) AS profile;
CREATE UNIQUE INDEX ON lens_seed_photographers (idx);

CREATE TEMP TABLE lens_seed_customers ON COMMIT DROP AS
SELECT
  series.idx::integer AS idx,
  pg_temp.lens_seed_uuid('customer', series.idx::text) AS id,
  pg_temp.lens_seed_uuid('customer-user', series.idx::text) AS user_id,
  pg_temp.lens_seed_uuid('customer-keycloak', series.idx::text)::text AS keycloak_id,
  profile.gender,
  pg_temp.lens_seed_name(series.idx, profile.gender) AS fullname,
  format('customer.%s@seed.invalid', lpad(series.idx::text, 6, '0')) AS email,
  '+8490' || lpad(series.idx::text, 8, '0') AS phone_number,
  (now() - ((series.idx % 365) * interval '1 day')) AS created_at
FROM lens_seed_settings AS settings
CROSS JOIN LATERAL generate_series(1, settings.customer_count) AS series(idx)
CROSS JOIN LATERAL (
  SELECT CASE WHEN series.idx % 10 < 5 THEN 'female'
    WHEN series.idx % 10 < 9 THEN 'male' ELSE 'other' END AS gender
) AS profile;
CREATE UNIQUE INDEX ON lens_seed_customers (idx);

INSERT INTO users (
  id, keycloak_id, fullname, email, phone_number, avatar_url, gender, dob,
  status, created_at, updated_at
)
SELECT
  user_id,
  keycloak_id,
  fullname,
  email,
  phone_number,
  (ARRAY[
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400'
  ]::text[])[((idx - 1) % 4) + 1],
  gender,
  date '1985-01-01' + ((idx * 17) % 9000),
  'active',
  created_at,
  created_at
FROM lens_seed_photographers
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (
  id, keycloak_id, fullname, email, phone_number, avatar_url, gender, dob,
  status, created_at, updated_at
)
SELECT
  user_id,
  keycloak_id,
  fullname,
  email,
  phone_number,
  (ARRAY[
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400'
  ]::text[])[((idx - 1) % 4) + 1],
  gender,
  date '1985-01-01' + ((idx * 23) % 9000),
  'active',
  created_at,
  created_at
FROM lens_seed_customers
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, user_id, preferred_styles, location, created_at, updated_at)
SELECT
  id,
  user_id,
  CASE idx % 4
    WHEN 0 THEN '["portrait", "family"]'::jsonb
    WHEN 1 THEN '["wedding", "outdoor"]'::jsonb
    WHEN 2 THEN '["fashion", "portrait"]'::jsonb
    ELSE '["event", "lifestyle"]'::jsonb
  END,
  CASE idx % 3
    WHEN 0 THEN 'Hà Nội'
    WHEN 1 THEN 'TP. Hồ Chí Minh'
    ELSE 'Đà Nẵng'
  END,
  created_at,
  created_at
FROM lens_seed_customers
ON CONFLICT (id) DO NOTHING;

INSERT INTO photographers (
  id, user_id, tax_code, styles, started_career_at, description,
  is_verified, verification_status, approved_by, location, is_available,
  created_at, updated_at
)
SELECT
  photographer.id,
  photographer.user_id,
  NULL,
  CASE photographer.idx % 5
    WHEN 0 THEN '["portrait", "family"]'::jsonb
    WHEN 1 THEN '["wedding", "outdoor"]'::jsonb
    WHEN 2 THEN '["fashion", "portrait"]'::jsonb
    WHEN 3 THEN '["event", "lifestyle"]'::jsonb
    ELSE '["product", "food", "commercial"]'::jsonb
  END,
  2010 + (photographer.idx % 16),
  CASE photographer.idx % 5
    WHEN 0 THEN 'Chuyên chụp chân dung và ảnh gia đình với ánh sáng tự nhiên, tư vấn tạo dáng kỹ để khách luôn thoải mái trước ống kính.'
    WHEN 1 THEN 'Nhận chụp phóng sự cưới và ảnh đôi, ưu tiên bắt khoảnh khắc chân thật cùng tông màu ấm áp, tinh tế.'
    WHEN 2 THEN 'Có kinh nghiệm thực hiện lookbook thời trang và ảnh thương hiệu cá nhân, hỗ trợ lên concept trước buổi chụp.'
    WHEN 3 THEN 'Chuyên chụp sự kiện, ảnh doanh nghiệp và những khoảnh khắc đời thường với phong cách tự nhiên, chỉn chu.'
    ELSE 'Thực hiện ảnh sản phẩm và ẩm thực cho cửa hàng, quán cà phê và thương hiệu đang cần bộ hình chỉn chu.'
  END,
  true,
  'verified',
  '10000000-0000-4000-8000-000000000001'::uuid,
  CASE photographer.idx % 3
    WHEN 0 THEN 'Hà Nội'
    WHEN 1 THEN 'TP. Hồ Chí Minh'
    ELSE 'Đà Nẵng'
  END,
  true,
  photographer.created_at,
  photographer.created_at
FROM lens_seed_photographers AS photographer
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE lens_seed_plans ON COMMIT DROP AS
SELECT
  photographer.idx,
  pg_temp.lens_seed_uuid('booking-plan', photographer.idx::text) AS id,
  photographer.id AS photographer_id,
  CASE photographer.idx % 3 WHEN 0 THEN 60 WHEN 1 THEN 90 ELSE 120 END AS duration_minutes,
  (500000 + (photographer.idx % 20) * 125000)::bigint AS price,
  photographer.created_at
FROM lens_seed_photographers AS photographer;
CREATE UNIQUE INDEX ON lens_seed_plans (idx);

INSERT INTO booking_plans (
  id, photographer_id, name, description, price, duration_minutes,
  photo_count, retouched_photo_count, features, is_active, created_at, updated_at
)
SELECT
  id,
  photographer_id,
  CASE idx % 5
    WHEN 0 THEN 'Chân dung ngoại cảnh và ảnh gia đình'
    WHEN 1 THEN 'Phóng sự cưới và ảnh đôi'
    WHEN 2 THEN 'Lookbook thời trang tại studio'
    WHEN 3 THEN 'Sự kiện và chân dung doanh nghiệp'
    ELSE 'Ảnh sản phẩm và ẩm thực cho thương hiệu'
  END,
  CASE idx % 5
    WHEN 0 THEN 'Buổi chụp 90 phút, hướng dẫn tạo dáng và bàn giao bộ ảnh đã cân chỉnh màu tự nhiên.'
    WHEN 1 THEN 'Ghi lại ngày vui theo phong cách phóng sự, gồm ảnh nghi lễ và những khoảnh khắc cùng gia đình.'
    WHEN 2 THEN 'Gói lookbook cho bộ sưu tập mới, hỗ trợ chọn bối cảnh và thống nhất bảng màu trước buổi chụp.'
    WHEN 3 THEN 'Chụp sự kiện hoặc hồ sơ doanh nghiệp, bàn giao ảnh chọn lọc phù hợp truyền thông và lưu trữ.'
    ELSE 'Chụp sản phẩm và món ăn với ánh sáng phù hợp, bàn giao ảnh đã chỉnh sửa cho website và mạng xã hội.'
  END,
  price,
  duration_minutes,
  40 + (idx % 60),
  8 + (idx % 12),
  '["seed_dataset"]'::jsonb,
  true,
  created_at,
  created_at
FROM lens_seed_plans
ON CONFLICT (id) DO NOTHING;

INSERT INTO portfolios (
  id, photographer_id, name, category, description, cover_media_id,
  items, created_at, updated_at
)
SELECT
  pg_temp.lens_seed_uuid('portfolio', photographer.idx::text),
  photographer.id,
  CASE photographer.idx % 5
    WHEN 0 THEN format('Chân dung đời thường — %s', photographer.fullname)
    WHEN 1 THEN format('Ngày vui trọn vẹn — %s', photographer.fullname)
    WHEN 2 THEN format('Lookbook mùa mới — %s', photographer.fullname)
    WHEN 3 THEN format('Khoảnh khắc đáng nhớ — %s', photographer.fullname)
    ELSE format('Ảnh sản phẩm và ẩm thực — %s', photographer.fullname)
  END,
  CASE photographer.idx % 5 WHEN 0 THEN 'portrait' WHEN 1 THEN 'wedding' WHEN 2 THEN 'fashion' WHEN 3 THEN 'event' ELSE 'product' END,
  CASE photographer.idx % 5
    WHEN 0 THEN 'Một bộ ảnh chân dung ngoại cảnh với ánh sáng dịu, màu sắc trong trẻo và cách tạo dáng tự nhiên.'
    WHEN 1 THEN 'Album phóng sự cưới ghi lại nghi lễ, gia đình và những khoảnh khắc thân mật trong ngày vui.'
    WHEN 2 THEN 'Bộ ảnh giới thiệu trang phục theo concept tối giản, tập trung vào chất liệu và phom dáng.'
    WHEN 3 THEN 'Tuyển chọn hình ảnh từ những sự kiện và buổi chụp gần đây của nhiếp ảnh gia.'
    ELSE 'Bộ hình sản phẩm và món ăn mẫu, tập trung vào màu sắc, chất liệu và cách trình bày.'
  END,
  NULL,
  '[]'::jsonb,
  photographer.created_at,
  photographer.created_at
FROM lens_seed_photographers AS photographer
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallets (id, user_id, balance, frozen_balance, created_at, updated_at)
SELECT
  pg_temp.lens_seed_uuid('wallet', account.user_id::text),
  account.user_id,
  0,
  0,
  account.created_at,
  account.created_at
FROM (
  SELECT user_id, created_at FROM lens_seed_photographers
  UNION ALL
  SELECT user_id, created_at FROM lens_seed_customers
) AS account
ON CONFLICT (id) DO NOTHING;

INSERT INTO offline_slots (id, photographer_id, "from", "to", reason, created_at, updated_at)
SELECT
  pg_temp.lens_seed_uuid('offline-slot', photographer.idx::text),
  photographer.id,
  ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')
      + ((photographer.idx % 60) + 1) * interval '1 day'
      + interval '13 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')
      + ((photographer.idx % 60) + 1) * interval '1 day'
      + interval '16 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  CASE photographer.idx % 4
    WHEN 0 THEN 'Nghỉ cá nhân'
    WHEN 1 THEN 'Đang chụp dự án riêng'
    WHEN 2 THEN 'Đi công tác'
    ELSE 'Nghỉ và bảo dưỡng thiết bị'
  END,
  now(),
  now()
FROM lens_seed_photographers AS photographer
ON CONFLICT (id) DO UPDATE SET
  "from" = EXCLUDED."from",
  "to" = EXCLUDED."to",
  reason = EXCLUDED.reason,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

CREATE TEMP TABLE lens_seed_bookings ON COMMIT DROP AS
WITH candidates AS (
  SELECT
    series.idx::integer AS idx,
    photographer.id AS photographer_id,
    photographer.user_id AS photographer_user_id,
    customer.id AS customer_id,
    customer.user_id AS customer_user_id,
    plan.id AS booking_plan_id,
    plan.duration_minutes,
    plan.price,
    CASE series.idx % 20
      WHEN 0 THEN 'completed'
      WHEN 1 THEN 'completed'
      WHEN 2 THEN 'completed'
      WHEN 3 THEN 'completed'
      WHEN 4 THEN 'completed'
      WHEN 5 THEN 'completed'
      WHEN 6 THEN 'completed'
      WHEN 7 THEN 'completed'
      WHEN 8 THEN 'completed'
      WHEN 9 THEN 'completed'
      WHEN 10 THEN 'completed'
      WHEN 11 THEN 'completed'
      WHEN 12 THEN 'cancelled'
      WHEN 13 THEN 'cancelled'
      WHEN 14 THEN 'cancelled'
      WHEN 15 THEN 'rejected'
      WHEN 16 THEN 'rejected'
      WHEN 17 THEN 'expired'
      WHEN 18 THEN 'expired'
      ELSE 'expired'
    END AS status,
    ((series.idx - 1) / settings.photographer_count)::integer AS photographer_slot
  FROM lens_seed_settings AS settings
  CROSS JOIN LATERAL generate_series(1, settings.booking_count) AS series(idx)
  JOIN lens_seed_photographers AS photographer
    ON photographer.idx = ((series.idx - 1) % settings.photographer_count) + 1
  JOIN lens_seed_customers AS customer
    ON customer.idx = ((series.idx - 1) % settings.customer_count) + 1
  JOIN lens_seed_plans AS plan ON plan.idx = photographer.idx
), timed AS (
  SELECT
    candidates.*,
    (((date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + time '08:00')
        AT TIME ZONE 'Asia/Ho_Chi_Minh')
      - ((45 + (photographer_slot / 6)) * interval '1 day')
      + ((photographer_slot % 6) * interval '2 hours')) AS shoot_from
  FROM candidates
)
SELECT
  idx,
  pg_temp.lens_seed_uuid('booking', idx::text) AS id,
  customer_id,
  customer_user_id,
  photographer_id,
  photographer_user_id,
  booking_plan_id,
  status,
  shoot_from AS booking_from,
  shoot_from + (duration_minutes * interval '1 minute') AS booking_to,
  price,
  ceil(price * 0.30)::bigint AS deposit_amount,
  shoot_from - interval '15 days' AS created_at,
  CASE WHEN status IN ('completed', 'cancelled')
    THEN shoot_from - interval '14 days' END AS accepted_at,
  CASE WHEN status = 'completed'
    THEN shoot_from + (duration_minutes * interval '1 minute') + interval '2 days' END AS gallery_published_at,
  CASE status
    WHEN 'completed' THEN shoot_from + (duration_minutes * interval '1 minute') + interval '2 days'
    WHEN 'cancelled' THEN shoot_from - interval '13 days'
    WHEN 'rejected' THEN shoot_from - interval '15 days' + interval '1 hour'
    ELSE shoot_from - interval '14 days' + interval '25 hours'
  END AS updated_at
FROM timed;

INSERT INTO bookings (
  id, customer_id, photographer_id, booking_plan_id, location,
  "from", "to", deposit_amount, total_amount, status,
  gallery_published_at, accepted_at, created_at, updated_at
)
SELECT
  booking.id,
  booking.customer_id,
  booking.photographer_id,
  booking.booking_plan_id,
  CASE booking.idx % 8
    WHEN 0 THEN 'Phố cổ Hội An, Đà Nẵng'
    WHEN 1 THEN 'Bãi biển Mỹ Khê, Đà Nẵng'
    WHEN 2 THEN 'Hồ Tây, Hà Nội'
    WHEN 3 THEN 'Văn Miếu, Hà Nội'
    WHEN 4 THEN 'Studio Quận 1, TP. Hồ Chí Minh'
    WHEN 5 THEN 'Thảo Cầm Viên, TP. Hồ Chí Minh'
    WHEN 6 THEN 'Cầu Rồng, Đà Nẵng'
    ELSE 'Khu đô thị Sala, TP. Hồ Chí Minh'
  END,
  booking.booking_from,
  booking.booking_to,
  booking.deposit_amount,
  booking.price,
  booking.status,
  booking.gallery_published_at,
  booking.accepted_at,
  booking.created_at,
  booking.updated_at
FROM lens_seed_bookings AS booking
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  photographer_id = EXCLUDED.photographer_id,
  booking_plan_id = EXCLUDED.booking_plan_id,
  location = EXCLUDED.location,
  "from" = EXCLUDED."from",
  "to" = EXCLUDED."to",
  deposit_amount = EXCLUDED.deposit_amount,
  total_amount = EXCLUDED.total_amount,
  status = EXCLUDED.status,
  gallery_published_at = EXCLUDED.gallery_published_at,
  accepted_at = EXCLUDED.accepted_at,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- Keep one settlement per generated completed booking; past holds are marked
-- processed while future-dated records remain available to the release worker.
INSERT INTO payment_escrow_settlements (
  booking_id, release_at, refund_request_deadline_at,
  release_processed_at, created_at, updated_at
)
SELECT
  booking.id,
  booking.updated_at + interval '72 hours',
  booking.updated_at + interval '72 hours',
  CASE WHEN booking.updated_at + interval '72 hours' <= now() THEN now() END,
  booking.updated_at,
  now()
FROM lens_seed_bookings AS booking
WHERE booking.status = 'completed'
ON CONFLICT (booking_id) DO UPDATE SET
  release_at = EXCLUDED.release_at,
  refund_request_deadline_at = EXCLUDED.refund_request_deadline_at,
  release_processed_at = EXCLUDED.release_processed_at,
  updated_at = EXCLUDED.updated_at;

WITH events AS (
  SELECT id, customer_id, customer_user_id AS actor_user_id,
    NULL::text AS from_status, 'pending'::text AS to_status,
    'customer'::text AS actor_role, NULL::text AS reason, created_at AS at, 0 AS step
  FROM lens_seed_bookings
  UNION ALL
  SELECT id, customer_id, photographer_user_id,
    'pending', 'accepted', 'photographer', NULL, created_at + interval '1 day', 1
  FROM lens_seed_bookings WHERE status IN ('completed', 'cancelled')
  UNION ALL
  SELECT id, customer_id, photographer_user_id,
    'accepted', 'in_progress', 'photographer', NULL, booking_from, 2
  FROM lens_seed_bookings WHERE status = 'completed'
  UNION ALL
  SELECT id, customer_id, photographer_user_id,
    'in_progress', 'shot', 'photographer', NULL, booking_to, 3
  FROM lens_seed_bookings WHERE status = 'completed'
  UNION ALL
  SELECT id, customer_id, customer_user_id,
    'shot', 'completed', 'customer', NULL, gallery_published_at, 4
  FROM lens_seed_bookings WHERE status = 'completed'
  UNION ALL
  SELECT id, customer_id, customer_user_id,
    'accepted', 'cancelled', 'customer', 'Seed fixture: customer cancelled.', created_at + interval '2 days', 2
  FROM lens_seed_bookings WHERE status = 'cancelled'
  UNION ALL
  SELECT id, customer_id, photographer_user_id,
    'pending', 'rejected', 'photographer', 'Seed fixture: photographer rejected the request.', created_at + interval '1 hour', 1
  FROM lens_seed_bookings WHERE status = 'rejected'
  UNION ALL
  SELECT id, customer_id, NULL::uuid,
    'pending', 'expired', 'system', 'Seed fixture: request expired without a response.', created_at + interval '25 hours', 1
  FROM lens_seed_bookings WHERE status = 'expired'
)
INSERT INTO booking_status_history (
  id, booking_id, from_status, to_status, actor_role, actor_user_id,
  reason, created_at, updated_at
)
SELECT
  pg_temp.lens_seed_uuid('booking-history', event.id::text || ':' || event.step::text),
  event.id,
  event.from_status,
  event.to_status,
  event.actor_role,
  event.actor_user_id,
  event.reason,
  event.at,
  event.at
FROM events AS event
ON CONFLICT (id) DO UPDATE SET
  from_status = EXCLUDED.from_status,
  to_status = EXCLUDED.to_status,
  actor_role = EXCLUDED.actor_role,
  actor_user_id = EXCLUDED.actor_user_id,
  reason = EXCLUDED.reason,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO booking_deliveries (id, booking_id, title, media_ids, created_at, updated_at)
SELECT
  pg_temp.lens_seed_uuid('booking-delivery', booking.id::text),
  booking.id,
  'Album ảnh đã chỉnh sửa',
  '[]'::jsonb,
  booking.gallery_published_at,
  booking.gallery_published_at
FROM lens_seed_bookings AS booking
WHERE booking.status = 'completed'
ON CONFLICT (id) DO UPDATE SET
  booking_id = EXCLUDED.booking_id,
  title = EXCLUDED.title,
  media_ids = EXCLUDED.media_ids,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO feedbacks (
  id, booking_id, customer_id, photographer_id, rating,
  punctuality_rating, attitude_rating, comment, is_edited,
  status, hidden_reason, photographer_reply, replied_at, created_at, updated_at
)
SELECT
  pg_temp.lens_seed_uuid('feedback', booking.id::text),
  booking.id,
  booking.customer_id,
  booking.photographer_id,
  3 + (booking.idx % 3),
  3 + ((booking.idx + 1) % 3),
  3 + ((booking.idx + 2) % 3),
  (ARRAY[
    'Ảnh đẹp và màu sắc đúng như hai bên đã trao đổi. Anh/chị hướng dẫn tạo dáng rất nhiệt tình.',
    'Buổi chụp diễn ra thoải mái, ekip đến đúng giờ và hỗ trợ cả gia đình rất chu đáo.',
    'Concept được chuẩn bị kỹ, ảnh bàn giao đúng hẹn và có nhiều khoảnh khắc tự nhiên.',
    'Nhiếp ảnh gia thân thiện, biết chọn góc chụp phù hợp. Mình rất hài lòng với bộ ảnh.',
    'Ảnh sự kiện được chọn lọc cẩn thận, thời gian bàn giao nhanh hơn dự kiến.'
  ]::text[])[((booking.idx - 1) % 5) + 1],
  false,
  'visible',
  NULL,
  'Cảm ơn bạn đã sử dụng dịch vụ.',
  booking.gallery_published_at + interval '1 day',
  booking.gallery_published_at + interval '1 day',
  booking.gallery_published_at + interval '1 day'
FROM lens_seed_bookings AS booking
WHERE booking.status = 'completed' AND booking.idx % 4 = 0
ON CONFLICT (id) DO UPDATE SET
  booking_id = EXCLUDED.booking_id,
  customer_id = EXCLUDED.customer_id,
  photographer_id = EXCLUDED.photographer_id,
  rating = EXCLUDED.rating,
  punctuality_rating = EXCLUDED.punctuality_rating,
  attitude_rating = EXCLUDED.attitude_rating,
  comment = EXCLUDED.comment,
  is_edited = EXCLUDED.is_edited,
  status = EXCLUDED.status,
  hidden_reason = EXCLUDED.hidden_reason,
  photographer_reply = EXCLUDED.photographer_reply,
  replied_at = EXCLUDED.replied_at,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

WITH returns AS (
  SELECT completed.photographer_id, count(*)::integer AS return_customers
  FROM (
    SELECT booking.photographer_id, booking.customer_id
    FROM bookings AS booking
    WHERE booking.photographer_id IN (SELECT id FROM lens_seed_photographers)
      AND booking.status = 'completed'
    GROUP BY booking.photographer_id, booking.customer_id
    HAVING count(*) > 1
  ) AS completed
  GROUP BY completed.photographer_id
), metrics AS (
  SELECT
    photographer.id AS photographer_id,
    coalesce(avg(feedback.rating) FILTER (WHERE feedback.status = 'visible'), 0)::numeric AS average_rating,
    count(DISTINCT feedback.id) FILTER (WHERE feedback.status = 'visible')::integer AS total_feedbacks,
    count(DISTINCT booking.id) FILTER (WHERE booking.status = 'completed')::integer AS total_bookings,
    coalesce(returns.return_customers, 0) AS return_customers
  FROM lens_seed_photographers AS photographer
  LEFT JOIN bookings AS booking ON booking.photographer_id = photographer.id
  LEFT JOIN feedbacks AS feedback ON feedback.booking_id = booking.id
  LEFT JOIN returns ON returns.photographer_id = photographer.id
  GROUP BY photographer.id, returns.return_customers
)
INSERT INTO photographer_ratings (
  id, photographer_id, average_rating, total_feedbacks,
  total_bookings, return_customers, created_at, updated_at
)
SELECT
  pg_temp.lens_seed_uuid('photographer-rating', metrics.photographer_id::text),
  metrics.photographer_id,
  metrics.average_rating,
  metrics.total_feedbacks,
  metrics.total_bookings,
  metrics.return_customers,
  now(),
  now()
FROM metrics
ON CONFLICT (photographer_id) DO UPDATE SET
  average_rating = EXCLUDED.average_rating,
  total_feedbacks = EXCLUDED.total_feedbacks,
  total_bookings = EXCLUDED.total_bookings,
  return_customers = EXCLUDED.return_customers,
  updated_at = EXCLUDED.updated_at;
