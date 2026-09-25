-- Danh mục hạng thợ và huy hiệu (L7): admin chỉnh được tên, ngưỡng, % commission không cần deploy.
-- Cách tính vẫn nằm trong code; bảng chỉ giữ con số và nội dung hiển thị.
CREATE TABLE ranks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    min_completed integer NOT NULL UNIQUE CHECK(min_completed >= 0),
    commission_percent numeric(5,2) NOT NULL CHECK(commission_percent BETWEEN 0 AND 100),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO ranks (code, name, min_completed, commission_percent) VALUES
    ('newbie', 'Tân binh', 0, 10),
    ('bronze', 'Đồng', 10, 9),
    ('silver', 'Bạc', 30, 8),
    ('gold', 'Vàng', 60, 7),
    ('diamond', 'Kim cương', 120, 5);

CREATE TABLE badges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    metric text NOT NULL CHECK(metric IN ('average_rating','average_punctuality','return_customers')),
    min_value numeric NOT NULL CHECK(min_value >= 0),
    min_reviews integer NOT NULL DEFAULT 0 CHECK(min_reviews >= 0),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO badges (code, name, description, metric, min_value, min_reviews) VALUES
    ('top-rated', 'Đánh giá xuất sắc', 'Điểm đánh giá trung bình từ 4.8 trên ít nhất 10 review', 'average_rating', 4.8, 10),
    ('punctual', 'Đúng giờ tuyệt đối', 'Điểm đúng giờ trung bình từ 4.8 trên ít nhất 10 review', 'average_punctuality', 4.8, 10),
    ('loyal', 'Khách quay lại', 'Ít nhất 5 khách đã đặt lịch lại', 'return_customers', 5, 0);

-- Huy hiệu đã cấp giờ trỏ vào danh mục thay vì danh sách mã cố định.
ALTER TABLE photographer_badges DROP CONSTRAINT photographer_badges_code_check;
ALTER TABLE photographer_badges
    ADD CONSTRAINT photographer_badges_code_fkey FOREIGN KEY (code) REFERENCES badges(code);
