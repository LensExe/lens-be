-- ============================================================================
-- Lens Platform - Production-Ready Data Dump (Exported Dataset - 2026)
-- ============================================================================
-- Tệp dữ liệu mẫu xuất xưởng (Production Data Export) cho hệ thống Lens Backend.
-- Toàn bộ mốc thời gian được chuẩn hóa đồng bộ trong năm 2026.
-- Toàn bộ ID sử dụng chuẩn UUID v4 (RFC 4122: xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx),
-- tương thích tuyệt đối với kiểu dữ liệu 'uuid' của PostgreSQL và validation @IsUUID('4').
-- Dữ liệu thực tế 100% bằng tiếng Việt: Tên người thật, số điện thoại, email,
-- địa chỉ thực tế (Hà Nội, TP.HCM, Đà Nẵng), gói dịch vụ cụ thể, feedback chân thực.
--
-- Đặc điểm:
--   - Chuẩn cú pháp SQL Data Export: Toàn bộ bảng sử dụng INSERT INTO ... VALUES (...)
--   - Dùng UUID v4 tĩnh cố định, liên kết khóa ngoại (Foreign Key) chặt chẽ trên cả 20 bảng.
--   - An toàn tuyệt đối (Idempotent): Sử dụng 'ON CONFLICT (id) DO NOTHING' cho phép nạp
--     (import) vào bất kỳ cơ sở dữ liệu PostgreSQL nào nhiều lần mà không bị lỗi trùng lặp.
--
-- Hướng dẫn nạp dữ liệu (Import):
--   Cách 1: npm run db:seed
--   Cách 2: psql -h <host> -p <port> -U <user> -d <database> -f migrations/seed_lens.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. BẢNG USERS (13 Người dùng thực tế: 2 Admin, 4 Nhiếp ảnh gia, 7 Khách hàng)
-- ============================================================================
INSERT INTO users (id, keycloak_id, fullname, email, phone_number, avatar_url, gender, dob, status, created_at, updated_at)
VALUES
  -- Quản trị viên (Admins)
  ('a0000000-0000-4000-8000-000000000001', 'a7273fb1-e142-4316-9a49-fb59e6e075e2', 'Nguyễn Hoàng Nam', 'nam.nguyen@lens.vn', '0901234567', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', 'male', '1990-05-15', 'active', '2026-01-15 08:30:00+07', '2026-01-15 08:30:00+07'),
  ('a0000000-0000-4000-8000-000000000002', '25c0f405-f789-412c-a6f6-54c6b40343e8', 'Trần Thị Thu Hà', 'ha.tran@lens.vn', '0912345678', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'female', '1993-08-20', 'active', '2026-01-16 09:00:00+07', '2026-01-16 09:00:00+07'),
  ('a0000000-0000-0000-0000-000000000003', '65d471e5-cef3-4659-b30c-add846a4d822', 'Đỗ Nguyễn Nhĩ Anh', 'anhdonguyennhi@gmail.com', '0965236772', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'male', '2005-03-29', 'active', '2026-02-16 09:00:00+07', '2026-02-16 09:00:00+07'),
  -- Nhiếp ảnh gia (Photographers)
  ('b0000000-0000-4000-8000-000000000001', '1857c612-ba2c-46d2-a45b-f705bf9ce052', 'Lê Quang Huy', 'lequanghuy.photo@gmail.com', '0983112233', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'male', '1994-03-12', 'active', '2026-02-10 10:15:00+07', '2026-02-10 10:15:00+07'),
  ('b0000000-0000-4000-8000-000000000002', '167b6f19-9246-465e-9cf4-753ddee0c02e', 'Phạm Minh Tuấn', 'tuan.pham.studio@gmail.com', '0974556677', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 'male', '1991-11-25', 'active', '2026-02-15 14:20:00+07', '2026-02-15 14:20:00+07'),
  ('b0000000-0000-4000-8000-000000000003', '067decba-a412-4fff-992d-aaca7f1dec11', 'Đỗ Thu Thảo', 'thao.dophotography@gmail.com', '0938889900', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', 'female', '1996-07-08', 'active', '2026-03-01 11:00:00+07', '2026-03-01 11:00:00+07'),
  ('b0000000-0000-4000-8000-000000000004', 'db8ad198-ef70-41bf-a254-301c7101bcf0', 'Vũ Hoàng Long', 'long.streetart@gmail.com', '0961223344', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400', 'male', '1998-09-30', 'active', '2026-03-12 16:45:00+07', '2026-03-12 16:45:00+07'),

  -- Khách hàng (Customers)
  ('c0000000-0000-4000-8000-000000000001', 'b1ba95e0-b6ad-4c42-a074-f75bb9b5fc47', 'Hoàng Mai Anh', 'maianh.hoang99@gmail.com', '0945667788', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', 'female', '1999-04-18', 'active', '2026-04-01 09:30:00+07', '2026-04-01 09:30:00+07'),
  ('c0000000-0000-4000-8000-000000000002', '9740c637-caa9-48d1-a6d8-c840b94d3c34', 'Trần Quốc Bảo', 'quocbao.tran@gmail.com', '0922334455', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400', 'male', '1997-12-05', 'active', '2026-04-05 10:00:00+07', '2026-04-05 10:00:00+07'),
  ('c0000000-0000-4000-8000-000000000003', 'b6955405-28cf-427f-bd96-06721da53982', 'Bùi Phương Linh', 'phuonglinh.bui@gmail.com', '0988776655', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', 'female', '2001-02-14', 'active', '2026-04-10 14:15:00+07', '2026-04-10 14:15:00+07'),
  ('c0000000-0000-4000-8000-000000000004', 'c96f35a8-ec5f-4499-a159-512e8941cadc', 'Vũ Thanh Tùng', 'tung.vuthanh@gmail.com', '0911224466', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 'male', '1995-10-22', 'active', '2026-04-15 15:40:00+07', '2026-04-15 15:40:00+07'),
  ('c0000000-0000-4000-8000-000000000005', 'adf5d2bf-7810-4979-a39b-f375d4e709d2', 'Đặng Hải Yến', 'haiyen.dang@gmail.com', '0933557799', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 'female', '1998-06-30', 'active', '2026-05-01 11:20:00+07', '2026-05-01 11:20:00+07'),
  ('c0000000-0000-4000-8000-000000000006', 'df9603d8-8d23-4446-8066-c5b198b1f7c8', 'Nguyễn Đức Anh', 'ducanh.nguyen@gmail.com', '0909112233', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', 'male', '2000-01-10', 'active', '2026-05-10 16:10:00+07', '2026-05-10 16:10:00+07'),
  ('c0000000-0000-4000-8000-000000000007', '1755f315-3f44-4ccb-9233-01371cc6ee23', 'Lê Khánh Huyền', 'khanhhuyen.le@gmail.com', '0977889911', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', 'female', '1996-08-19', 'suspended', '2026-05-15 13:00:00+07', '2026-05-20 18:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. BẢNG ADMINS (Phân quyền Quản trị viên)
-- ============================================================================
INSERT INTO admins (id, user_id, is_active, created_at, updated_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', true, '2026-01-15 08:30:00+07', '2026-01-15 08:30:00+07'),
  ('10000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', true, '2026-01-16 09:00:00+07', '2026-01-16 09:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. BẢNG CUSTOMERS (Hồ sơ Khách hàng)
-- ============================================================================
INSERT INTO customers (id, user_id, preferred_styles, location, created_at, updated_at)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', '["portrait", "vintage", "korean"]'::jsonb, 'Quận Đống Đa, Hà Nội', '2026-04-01 09:30:00+07', '2026-04-01 09:30:00+07'),
  ('20000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', '["wedding", "concept", "pre-wedding"]'::jsonb, 'Quận 7, TP. Hồ Chí Minh', '2026-04-05 10:00:00+07', '2026-04-05 10:00:00+07'),
  ('20000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', '["portrait", "beach", "lifestyle"]'::jsonb, 'Quận Sơn Trà, Đà Nẵng', '2026-04-10 14:15:00+07', '2026-04-10 14:15:00+07'),
  ('20000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', '["event", "corporate", "portrait"]'::jsonb, 'Quận Ba Đình, Hà Nội', '2026-04-15 15:40:00+07', '2026-04-15 15:40:00+07'),
  ('20000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', '["family", "outdoor", "kids"]'::jsonb, 'Ninh Kiều, Cần Thơ', '2026-05-01 11:20:00+07', '2026-05-01 11:20:00+07'),
  ('20000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000006', '["streetwear", "fashion", "film"]'::jsonb, 'Quận 3, TP. Hồ Chí Minh', '2026-05-10 16:10:00+07', '2026-05-10 16:10:00+07'),
  ('20000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000007', '["portrait"]'::jsonb, 'Quận Cầu Giấy, Hà Nội', '2026-05-15 13:00:00+07', '2026-05-20 18:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. BẢNG PHOTOGRAPHERS (Hồ sơ Nhiếp ảnh gia chuyên nghiệp)
-- ============================================================================
INSERT INTO photographers (id, user_id, tax_code, styles, started_career_at, description, is_verified, verification_status, approved_by, location, is_available, created_at, updated_at)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '0401827364', '["portrait", "wedding", "vintage"]'::jsonb, 2018, 'Nhiếp ảnh gia với hơn 8 năm kinh nghiệm trong lĩnh vực ảnh cưới phóng sự và ảnh chân dung nghệ thuật tại Đà Nẵng & Hội An.', true, 'verified', '10000000-0000-4000-8000-000000000001', 'Quận Hải Châu, Đà Nẵng', true, '2026-02-10 10:15:00+07', '2026-02-12 11:00:00+07'),
  ('30000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', '0315928374', '["lookbook", "fashion", "commercial"]'::jsonb, 2016, 'Chuyên thực hiện lookbook cho các Local Brand thời trang cao cấp và chụp ảnh Profile doanh nhân tại TP. Hồ Chí Minh.', true, 'verified', '10000000-0000-4000-8000-000000000002', 'Quận 1, TP. Hồ Chí Minh', true, '2026-02-15 14:20:00+07', '2026-02-16 15:30:00+07'),
  ('30000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', '0108273645', '["family", "event", "maternity"]'::jsonb, 2019, 'Lưu giữ những khoảnh khắc gia đình ấm áp, tiệc thôi nôi và bộ ảnh ngoại cảnh tự nhiên giàu cảm xúc.', true, 'verified', '10000000-0000-4000-8000-000000000001', 'Quận Ba Đình, Hà Nội', true, '2026-03-01 11:00:00+07', '2026-03-02 09:45:00+07'),
  ('30000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', '0109382716', '["streetwear", "film", "lifestyle"]'::jsonb, 2021, 'Đam mê chất màu film hoài cổ, bắt trọn từng khoảnh khắc cảm xúc đời thường và phong cách đường phố năng động.', true, 'verified', '10000000-0000-4000-8000-000000000002', 'Quận Cầu Giấy, Hà Nội', true, '2026-03-12 16:45:00+07', '2026-03-14 10:20:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. BẢNG PHOTOGRAPHER_RATINGS (Điểm đánh giá tích lũy của Thợ ảnh)
-- ============================================================================
INSERT INTO photographer_ratings (id, photographer_id, average_rating, total_feedbacks, total_bookings, return_customers, created_at, updated_at)
VALUES
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 4.95, 28, 35, 12, '2026-02-12 11:00:00+07', '2026-08-10 17:00:00+07'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 4.88, 42, 50, 18, '2026-02-16 15:30:00+07', '2026-08-25 18:30:00+07'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 5.00, 19, 22, 8, '2026-03-02 09:45:00+07', '2026-08-20 14:10:00+07'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 4.75, 15, 18, 4, '2026-03-14 10:20:00+07', '2026-09-01 12:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. BẢNG BOOKING_PLANS (Gói dịch vụ cụ thể của từng Thợ ảnh)
-- ============================================================================
INSERT INTO booking_plans (id, photographer_id, name, description, price, duration_minutes, photo_count, retouched_photo_count, features, is_active, created_at, updated_at)
VALUES
  -- Gói của Lê Quang Huy
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Chụp chân dung ngoại cảnh (Portrait Demo)', 'Gói chụp chân dung ngoại cảnh 90 phút tại Phố cổ Hội An hoặc bãi biển Mỹ Khê. Hỗ trợ tạo dáng tận tình.', 1000000, 90, 50, 10, '["Toàn bộ ảnh gốc", "10 ảnh chỉnh sửa chuyên sâu", "Hỗ trợ 1 bộ phụ kiện"]'::jsonb, true, '2026-02-15 09:00:00+07', '2026-02-15 09:00:00+07'),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Phóng sự cưới cao cấp trọn gói', 'Gói chụp phóng sự ngày cưới trọn gói 1 ngày. Bắt trọn những khoảnh khắc thiêng liêng và xúc động nhất.', 6500000, 360, 400, 40, '["Toàn bộ file gốc chất lượng cao", "40 ảnh blend màu nghệ thuật", "Tặng kèm 01 Album Photobook 30x30"]'::jsonb, true, '2026-02-15 09:00:00+07', '2026-02-15 09:00:00+07'),

  -- Gói của Phạm Minh Tuấn
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'Chụp Lookbook thời trang Local Brand', 'Chụp lookbook thương mại cho các bộ sưu tập thời trang. Ekip hỗ trợ setup ánh sáng chuẩn studio.', 3000000, 180, 150, 20, '["Tư vấn concept & moodboard", "Chỉnh màu chuẩn in ấn & web", "Bàn giao file trong 48h"]'::jsonb, true, '2026-02-20 10:00:00+07', '2026-02-20 10:00:00+07'),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'Chụp ảnh Profile doanh nhân & Beauty', 'Gói chụp profile cá nhân chuyên nghiệp, xây dựng thương hiệu cá nhân trên mạng xã hội và báo chí.', 1800000, 120, 80, 12, '["Chụp tại studio chuẩn ánh sáng", "Makeup nhẹ & làm tóc", "Chỉnh sửa da cao cấp chuyên sâu"]'::jsonb, true, '2026-02-20 10:00:00+07', '2026-02-20 10:00:00+07'),

  -- Gói của Đỗ Thu Thảo
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', 'Chụp ảnh kỷ niệm gia đình ngoại cảnh', 'Buổi chụp ấm cúng cho cả gia đình tại công viên hoặc khuôn viên nhà riêng. Phong cách tự nhiên.', 1500000, 90, 80, 15, '["Toàn bộ file gốc", "15 ảnh chỉnh sửa ấm áp", "Tặng 01 ảnh in ép gỗ mica 20x30"]'::jsonb, true, '2026-03-05 08:30:00+07', '2026-03-05 08:30:00+07'),
  ('50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000003', 'Chụp tiệc thôi nôi & sinh nhật bé', 'Chụp phóng sự tiệc sinh nhật của bé yêu. Ghi lại trọn vẹn niềm vui của bé và người thân.', 2200000, 180, 200, 30, '["Không giới hạn số lượng ảnh chụp", "Blend màu tươi sáng trẻ trung", "Giao ảnh nhanh trong 24h"]'::jsonb, true, '2026-03-05 08:30:00+07', '2026-03-05 08:30:00+07'),

  -- Gói của Vũ Hoàng Long
  ('50000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000004', 'Chụp ảnh đường phố Streetwear & Film tone', 'Phong cách đường phố đậm chất điện ảnh, tone màu film 35mm hoài cổ cực chất.', 800000, 60, 40, 10, '["Chụp tại các góc phố cổ & cà phê", "Tone màu film vintage độc quyền", "Tặng file scan chất lượng cao"]'::jsonb, true, '2026-03-15 14:00:00+07', '2026-03-15 14:00:00+07'),
  ('50000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000004', 'Chụp đôi tình nhân Vibe Hàn Quốc', 'Buổi hẹn hò ngọt ngào được ghi lại bằng những khung hình lãng mạn như phim truyền hình.', 1400000, 120, 90, 15, '["Lên kịch bản concept hẹn hò", "Hỗ trợ chọn trang phục đồng điệu", "15 ảnh chỉnh sửa màu cảm xúc"]'::jsonb, true, '2026-03-15 14:00:00+07', '2026-03-15 14:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. BẢNG PHOTOGRAPHER_PLANS (Gói hội viên nền tảng Lens dành cho Thợ ảnh)
-- ============================================================================
INSERT INTO photographer_plans (id, code, name, description, price, is_active, billing_cycle, features, created_at, updated_at)
VALUES
  ('60000000-0000-4000-8000-000000000001', 'VIP_DEMO', 'Gói Trải Nghiệm VIP Demo', 'Gói hội viên trả trước 30 ngày phục vụ trải nghiệm và kiểm thử hệ thống.', 99000, true, 30, '["portfolio_unlimited", "analytics_basic", "priority_support"]'::jsonb, '2026-01-01 00:00:00+07', '2026-01-01 00:00:00+07'),
  ('60000000-0000-4000-8000-000000000002', 'PRO_30D', 'Gói Chuyên Nghiệp (30 ngày)', 'Dành cho nhiếp ảnh gia cá nhân muốn tối ưu hiển thị và tiếp cận khách hàng tiềm năng.', 199000, true, 30, '["portfolio_unlimited", "analytics_advanced", "verified_badge", "badge_pro"]'::jsonb, '2026-01-01 00:00:00+07', '2026-01-01 00:00:00+07'),
  ('60000000-0000-4000-8000-000000000003', 'PRO_90D', 'Gói Nâng Cao (90 ngày - Tiết kiệm 15%)', 'Gói quý tối ưu chi phí, nâng thứ hạng tìm kiếm trên ứng dụng Lens.', 499000, true, 90, '["portfolio_unlimited", "analytics_advanced", "search_boost_x2", "priority_support_247"]'::jsonb, '2026-01-01 00:00:00+07', '2026-01-01 00:00:00+07'),
  ('60000000-0000-4000-8000-000000000004', 'STUDIO_365D', 'Gói Doanh Nghiệp / Studio (1 năm)', 'Gói trọn gói 1 năm dành cho Studio chuyên nghiệp, hỗ trợ tối đa tính năng marketing.', 1799000, true, 365, '["all_features", "search_boost_x5", "featured_homepage", "dedicated_manager"]'::jsonb, '2026-01-01 00:00:00+07', '2026-01-01 00:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. BẢNG SUBSCRIPTIONS (Đăng ký gói hội viên của Thợ ảnh trong năm 2026)
-- ============================================================================
INSERT INTO subscriptions (id, photographer_id, plan_id, start_at, end_at, status, auto_renew, price, created_at, updated_at)
VALUES
  ('70000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000004', '2026-01-01 00:00:00+07', '2027-01-01 00:00:00+07', 'active', true, 1799000, '2026-01-01 00:00:00+07', '2026-01-01 00:00:00+07'),
  ('70000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000003', '2026-06-01 00:00:00+07', '2026-09-01 00:00:00+07', 'active', true, 499000, '2026-06-01 00:00:00+07', '2026-06-01 00:00:00+07'),
  ('70000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002', '2026-08-15 00:00:00+07', '2026-09-14 00:00:00+07', 'active', false, 199000, '2026-08-15 00:00:00+07', '2026-08-15 00:00:00+07'),
  ('70000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000001', '2026-09-01 00:00:00+07', '2026-10-01 00:00:00+07', 'active', true, 99000, '2026-09-01 00:00:00+07', '2026-09-01 00:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. BẢNG OFFLINE_SLOTS (Ngày bận / nghỉ cá nhân của Thợ ảnh trong năm 2026)
-- ============================================================================
INSERT INTO offline_slots (id, photographer_id, date, reason, created_at, updated_at)
VALUES
  ('80000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '2026-10-15', 'Nghỉ bảo dưỡng và hiệu chuẩn thiết bị máy ảnh', '2026-03-10 08:00:00+07', '2026-03-10 08:00:00+07'),
  ('80000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '2026-11-20', 'Tham gia triển lãm ảnh nghệ thuật Đà Nẵng', '2026-03-10 08:00:00+07', '2026-03-10 08:00:00+07'),
  ('80000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', '2026-10-25', 'Lịch cá nhân / Việc gia đình', '2026-03-12 09:30:00+07', '2026-03-12 09:30:00+07'),
  ('80000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000003', '2026-12-01', 'Lịch đào tạo trợ lý studio', '2026-03-15 14:00:00+07', '2026-03-15 14:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. BẢNG WALLETS (Ví nội bộ của tất cả người dùng)
-- ============================================================================
INSERT INTO wallets (id, user_id, balance, frozen_balance, created_at, updated_at)
VALUES
  -- Ví của Admin
  ('90000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 50000000, 0, '2026-01-15 08:30:00+07', '2026-01-15 08:30:00+07'),
  ('90000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 35000000, 0, '2026-01-16 09:00:00+07', '2026-01-16 09:00:00+07'),

  -- Ví của Thợ ảnh (có doanh thu tích lũy)
  ('90000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 12400000, 1000000, '2026-02-10 10:15:00+07', '2026-09-10 10:15:00+07'),
  ('90000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000002', 18600000, 900000, '2026-02-15 14:20:00+07', '2026-09-10 14:20:00+07'),
  ('90000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000003', 8200000, 450000, '2026-03-01 11:00:00+07', '2026-09-10 11:00:00+07'),
  ('90000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000004', 5500000, 240000, '2026-03-12 16:45:00+07', '2026-09-10 16:45:00+07'),

  -- Ví của Khách hàng
  ('90000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-000000000001', 2500000, 0, '2026-04-01 09:30:00+07', '2026-04-01 09:30:00+07'),
  ('90000000-0000-4000-8000-000000000022', 'c0000000-0000-4000-8000-000000000002', 4200000, 0, '2026-04-05 10:00:00+07', '2026-04-05 10:00:00+07'),
  ('90000000-0000-4000-8000-000000000023', 'c0000000-0000-4000-8000-000000000003', 1800000, 0, '2026-04-10 14:15:00+07', '2026-04-10 14:15:00+07'),
  ('90000000-0000-4000-8000-000000000024', 'c0000000-0000-4000-8000-000000000004', 500000, 0, '2026-04-15 15:40:00+07', '2026-04-15 15:40:00+07'),
  ('90000000-0000-4000-8000-000000000025', 'c0000000-0000-4000-8000-000000000005', 3100000, 0, '2026-05-01 11:20:00+07', '2026-05-01 11:20:00+07'),
  ('90000000-0000-4000-8000-000000000026', 'c0000000-0000-4000-8000-000000000006', 750000, 0, '2026-05-10 16:10:00+07', '2026-05-10 16:10:00+07'),
  ('90000000-0000-4000-8000-000000000027', 'c0000000-0000-4000-8000-000000000007', 0, 0, '2026-05-15 13:00:00+07', '2026-05-20 18:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. BẢNG MEDIA (Tệp ảnh / video thực tế của hệ thống)
-- ============================================================================
INSERT INTO media (id, user_id, file_key, file_size, content_type, status, created_at, updated_at)
VALUES
  -- Ảnh Portfolio của Lê Quang Huy
  ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'portfolios/huy-le/hoian-sunset-01.jpg', 3450000, 'image/jpeg', 'ready', '2026-03-01 10:00:00+07', '2026-03-01 10:00:00+07'),
  ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'portfolios/huy-le/mykhe-beach-02.jpg', 4200000, 'image/jpeg', 'ready', '2026-03-01 10:00:00+07', '2026-03-01 10:00:00+07'),
  ('e0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'portfolios/huy-le/wedding-vintage-03.jpg', 5100000, 'image/jpeg', 'ready', '2026-03-01 10:00:00+07', '2026-03-01 10:00:00+07'),

  -- Ảnh Portfolio của Phạm Minh Tuấn
  ('e0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'portfolios/tuan-pham/lookbook-summer-01.jpg', 4800000, 'image/jpeg', 'ready', '2026-03-10 14:00:00+07', '2026-03-10 14:00:00+07'),
  ('e0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 'portfolios/tuan-pham/profile-ceo-02.jpg', 3900000, 'image/jpeg', 'ready', '2026-03-10 14:00:00+07', '2026-03-10 14:00:00+07'),

  -- Ảnh sản phẩm bàn giao (Deliveries)
  ('e0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'deliveries/booking-001/final-retouched-01.jpg', 5500000, 'image/jpeg', 'ready', '2026-07-17 09:40:00+07', '2026-07-17 09:40:00+07'),
  ('e0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000002', 'deliveries/booking-002/lookbook-master-01.jpg', 6200000, 'image/jpeg', 'ready', '2026-08-12 10:55:00+07', '2026-08-12 10:55:00+07'),

  -- Ảnh bằng chứng báo cáo vi phạm
  ('e0000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-000000000001', 'reports/evidence/screenshot-chat-delay.jpg', 850000, 'image/jpeg', 'ready', '2026-07-16 09:50:00+07', '2026-07-16 09:50:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. BẢNG PORTFOLIOS (Bộ sưu tập tác phẩm của Thợ ảnh)
-- ============================================================================
INSERT INTO portfolios (id, photographer_id, name, category, description, cover_media_id, items, created_at, updated_at)
VALUES
  ('f0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Hội An - Nắng Hoàng Hôn và Nàng Thơ', 'portrait', 'Bộ ảnh chân dung chụp vào buổi chiều tà rực rỡ bên dòng sông Hoài thơ mộng.', 'e0000000-0000-4000-8000-000000000001', '["e0000000-0000-4000-8000-000000000001", "e0000000-0000-4000-8000-000000000002", "e0000000-0000-4000-8000-000000000003"]'::jsonb, '2026-03-05 10:00:00+07', '2026-03-05 10:00:00+07'),
  ('f0000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Sài Gòn Retro Lookbook Summer 2026', 'fashion', 'Lookbook bộ sưu tập mùa hè đậm chất phóng khoáng, hiện đại trên đường phố Quận 1.', 'e0000000-0000-4000-8000-000000000004', '["e0000000-0000-4000-8000-000000000004", "e0000000-0000-4000-8000-000000000005"]'::jsonb, '2026-03-15 15:00:00+07', '2026-03-15 15:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 13. BẢNG BOOKINGS (Đơn đặt lịch chụp ảnh thực tế giữa Khách và Thợ trong năm 2026)
-- ============================================================================
INSERT INTO bookings (id, customer_id, photographer_id, booking_plan_id, location, "from", "to", deposit_amount, total_amount, status, gallery_published_at, created_at, updated_at)
VALUES
  -- Booking 1: Hoàn thành & đã bàn giao ảnh (Tháng 7/2026)
  ('d0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Chùa Cầu & Sông Hoài, Phố cổ Hội An', '2026-07-15 15:30:00+07', '2026-07-15 17:00:00+07', 300000, 1000000, 'completed', '2026-07-17 10:00:00+07', '2026-07-05 10:00:00+07', '2026-07-17 10:00:00+07'),

  -- Booking 2: Đã chụp xong, đang bàn giao ảnh (Tháng 8/2026)
  ('d0000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', 'Studio Quận 1 & Bưu điện Trung tâm TP.HCM', '2026-08-10 09:00:00+07', '2026-08-10 12:00:00+07', 900000, 3000000, 'shot', NULL, '2026-08-01 14:00:00+07', '2026-08-10 12:30:00+07'),

  -- Booking 3: Thợ ảnh đã chấp nhận lịch sắp tới (Tháng 10/2026)
  ('d0000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000005', 'Công viên Thống Nhất & Hồ Gươm, Hà Nội', '2026-10-20 08:30:00+07', '2026-10-20 10:00:00+07', 450000, 1500000, 'accepted', NULL, '2026-09-01 09:15:00+07', '2026-09-01 11:00:00+07'),

  -- Booking 4: Khách đã hủy trước ngày chụp và yêu cầu hoàn cọc (Tháng 7/2026)
  ('d0000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000007', 'Phố sách Đinh Lễ & Phố đi bộ Hồ Gươm', '2026-07-28 14:00:00+07', '2026-07-28 15:00:00+07', 240000, 800000, 'cancelled', NULL, '2026-07-10 16:30:00+07', '2026-07-20 10:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 14. BẢNG TRANSACTIONS (Giao dịch tài chính trong năm 2026)
-- ============================================================================
INSERT INTO transactions (id, user_id, transaction_code, type, reference_id, direction, amount, currency, description, status, payment_gateway, provider_order_code, checkout_url, idempotency_key, created_at, updated_at)
VALUES
  -- Giao dịch cọc Booking 1 (300.000 đ)
  ('11000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'DEP-BK001-20260705', 'deposit', 'd0000000-0000-4000-8000-000000000001', 'in', 300000, 'VND', 'Thanh toán đặt cọc 30% cho đơn chụp ảnh Hội An', 'paid', 'payos', 100001, 'https://pay.payos.vn/web/100001', 'idemp-dep-bk001', '2026-07-05 10:05:00+07', '2026-07-05 10:08:00+07'),

  -- Giao dịch thanh toán nốt 70% Booking 1 (700.000 đ)
  ('11000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'REM-BK001-20260717', 'remaining', 'd0000000-0000-4000-8000-000000000001', 'in', 700000, 'VND', 'Thanh toán số tiền 70% còn lại sau khi nhận ảnh', 'paid', 'payos', 100002, 'https://pay.payos.vn/web/100002', 'idemp-rem-bk001', '2026-07-17 10:15:00+07', '2026-07-17 10:18:00+07'),

  -- Giao dịch cọc Booking 2 (900.000 đ)
  ('11000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', 'DEP-BK002-20260801', 'deposit', 'd0000000-0000-4000-8000-000000000002', 'in', 900000, 'VND', 'Thanh toán đặt cọc 30% cho gói Lookbook thời trang', 'paid', 'payos', 100003, 'https://pay.payos.vn/web/100003', 'idemp-dep-bk002', '2026-08-01 14:05:00+07', '2026-08-01 14:07:00+07'),

  -- Giao dịch cọc Booking 3 (450.000 đ)
  ('11000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000003', 'DEP-BK003-20260901', 'deposit', 'd0000000-0000-4000-8000-000000000003', 'in', 450000, 'VND', 'Thanh toán đặt cọc 30% cho gói chụp gia đình ngoại cảnh', 'paid', 'payos', 100004, 'https://pay.payos.vn/web/100004', 'idemp-dep-bk003', '2026-09-01 09:20:00+07', '2026-09-01 09:23:00+07'),

  -- Giao dịch cọc Booking 4 (240.000 đ - Đã hủy)
  ('11000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000004', 'DEP-BK004-20260710', 'deposit', 'd0000000-0000-4000-8000-000000000004', 'in', 240000, 'VND', 'Thanh toán đặt cọc gói chụp đường phố', 'paid', 'payos', 100005, 'https://pay.payos.vn/web/100005', 'idemp-dep-bk004', '2026-07-10 16:35:00+07', '2026-07-10 16:38:00+07'),

  -- Giao dịch mua gói hội viên của Thợ Huy (1.799.000 đ)
  ('11000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'SUB-HUY-20260101', 'subscription', '70000000-0000-4000-8000-000000000001', 'in', 1799000, 'VND', 'Thanh toán gói hội viên Doanh nghiệp 1 năm', 'paid', 'payos', 100011, 'https://pay.payos.vn/web/100011', 'idemp-sub-huy-01', '2026-01-01 00:05:00+07', '2026-01-01 00:08:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 15. BẢNG PAYMENT_WEBHOOKS (Xác nhận Webhook thành công từ Cổng PayOS)
-- ============================================================================
INSERT INTO payment_webhooks (id, provider, reference, transaction_id, created_at, updated_at)
VALUES
  ('12000000-0000-4000-8000-000000000001', 'payos', 'PAYOS-REF-100001-SUCCESS', '11000000-0000-4000-8000-000000000001', '2026-07-05 10:08:01+07', '2026-07-05 10:08:01+07'),
  ('12000000-0000-4000-8000-000000000002', 'payos', 'PAYOS-REF-100002-SUCCESS', '11000000-0000-4000-8000-000000000002', '2026-07-17 10:18:02+07', '2026-07-17 10:18:02+07'),
  ('12000000-0000-4000-8000-000000000003', 'payos', 'PAYOS-REF-100003-SUCCESS', '11000000-0000-4000-8000-000000000003', '2026-08-01 14:07:05+07', '2026-08-01 14:07:05+07'),
  ('12000000-0000-4000-8000-000000000011', 'payos', 'PAYOS-REF-100011-SUCCESS', '11000000-0000-4000-8000-000000000011', '2026-01-01 00:08:03+07', '2026-01-01 00:08:03+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 16. BẢNG REFUND_REQUESTS (Yêu cầu hoàn cọc khi hủy đơn trong năm 2026)
-- ============================================================================
INSERT INTO refund_requests (id, transaction_id, user_id, amount, reason, status, created_at, updated_at)
VALUES
  ('13000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000004', 240000, 'Khách hàng có chuyến công tác đột xuất vào ngày chụp, thông báo trước 8 ngày theo đúng chính sách hoàn cọc.', 'requested', '2026-07-20 10:05:00+07', '2026-07-20 10:05:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 17. BẢNG BOOKING_DELIVERIES (Bàn giao sản phẩm album ảnh cho Khách hàng)
-- ============================================================================
INSERT INTO booking_deliveries (id, booking_id, title, media_ids, created_at, updated_at)
VALUES
  ('14000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Album hoàn thiện - Nàng thơ Hội An', '["e0000000-0000-4000-8000-000000000011"]'::jsonb, '2026-07-17 09:45:00+07', '2026-07-17 09:45:00+07'),
  ('14000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'Bàn giao file gốc Lookbook Local Brand', '["e0000000-0000-4000-8000-000000000012"]'::jsonb, '2026-08-12 11:00:00+07', '2026-08-12 11:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 18. BẢNG FEEDBACKS (Đánh giá thực tế từ Khách hàng & Phản hồi của Thợ ảnh)
-- ============================================================================
INSERT INTO feedbacks (id, booking_id, customer_id, rating, punctuality_rating, attitude_rating, comment, is_edited, is_visible, photographer_reply, replied_at, created_at, updated_at)
VALUES
  ('15000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 5, 5, 5, 'Anh Huy chụp siêu có tâm, nhiệt tình chỉ cách tạo dáng cho hai đứa từ đầu đến cuối. Nước màu ảnh rất trong trẻo, giao ảnh đúng hẹn!', false, true, 'Cảm ơn Mai Anh và bạn đã tin tưởng dịch vụ của Huy nhé. Chúc hai bạn luôn ngập tràn niềm vui!', '2026-07-18 08:30:00+07', '2026-07-17 20:00:00+07', '2026-07-18 08:30:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 19. BẢNG REPORTS (Báo cáo khiếu nại & Xử lý tranh chấp của Quản trị viên)
-- ============================================================================
INSERT INTO reports (id, user_id, target_type, target_id, reason, evidence_media_ids, status, resolution, resolved_by, created_at, updated_at)
VALUES
  ('16000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'booking', 'd0000000-0000-4000-8000-000000000001', 'Khách hàng phản ánh thợ ảnh phản hồi tin nhắn chậm 1 ngày trong quá trình chọn ảnh chỉnh sửa.', '["e0000000-0000-4000-8000-000000000021"]'::jsonb, 'resolved', 'Admin đã liên hệ thợ ảnh xác minh. Thợ ảnh gửi lời xin lỗi và đã bàn giao ảnh đúng hạn kèm tặng thêm 3 ảnh blend màu.', 'a0000000-0000-4000-8000-000000000001', '2026-07-16 10:00:00+07', '2026-07-16 15:30:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 20. BẢNG OUTBOX_EVENTS (Sự kiện thông báo Realtime phát qua Socket.IO)
-- ============================================================================
INSERT INTO outbox_events (id, topic, recipient_ids, payload, processed_at, created_at, updated_at)
VALUES
  ('17000000-0000-4000-8000-000000000001', 'booking.completed', '["c0000000-0000-4000-8000-000000000001", "b0000000-0000-4000-8000-000000000001"]'::jsonb, '{"booking_id": "d0000000-0000-4000-8000-000000000001", "status": "completed", "message": "Đơn đặt lịch chụp ảnh tại Hội An đã hoàn thành thành công."}'::jsonb, '2026-07-17 10:00:05+07', '2026-07-17 10:00:00+07', '2026-07-17 10:00:05+07'),
  ('17000000-0000-4000-8000-000000000002', 'payment.success', '["c0000000-0000-4000-8000-000000000001"]'::jsonb, '{"transaction_id": "11000000-0000-4000-8000-000000000001", "amount": 300000, "message": "Thanh toán đặt cọc 300.000 VND thành công qua PayOS."}'::jsonb, '2026-07-05 10:08:02+07', '2026-07-05 10:08:00+07', '2026-07-05 10:08:02+07'),
  ('17000000-0000-4000-8000-000000000003', 'booking.accepted', '["c0000000-0000-4000-8000-000000000003"]'::jsonb, '{"booking_id": "d0000000-0000-4000-8000-000000000003", "status": "accepted", "message": "Nhiếp ảnh gia Đỗ Thu Thảo đã chấp nhận yêu cầu đặt lịch của bạn."}'::jsonb, '2026-09-01 11:00:05+07', '2026-09-01 11:00:00+07', '2026-09-01 11:00:05+07')
ON CONFLICT (id) DO NOTHING;

COMMIT;
