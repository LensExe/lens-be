import type { PhotographyStyle } from '@shared/domain/values/photography-style.values';

/**
 * Input cho truy vấn lấy thông tin customer profile của người dùng hiện tại.
 * Không cần tham số đầu vào vì thông tin xác thực được lấy từ Actor (Token).
 */
export type CustomerMeQueryInput = Record<string, never>;

/**
 * Input cho lệnh cập nhật customer profile của người dùng đang đăng nhập.
 * Tất cả các trường đều là tuỳ chọn.
 */
export interface CustomerUpdateCommandInput {
  /** Giới thiệu ngắn hoặc nhu cầu chụp ảnh của khách hàng */
  description?: string | null;
  /** Danh sách phong cách chụp ảnh yêu thích (ví dụ: portrait, wedding, event...) */
  preferred_styles?: PhotographyStyle[];
  /** Khu vực / địa điểm hoạt động hoặc nơi cư trú của khách hàng */
  location?: string | null;
}

/**
 * Input cho truy vấn lấy customer profile của một khách hàng bất kỳ (dành cho Admin).
 */
export interface CustomerAdminGetQueryInput {
  /** ID (UUID) của customer cần xem */
  customer_id: string;
}

/**
 * Input cho truy vấn lấy danh sách customer (dành cho Admin).
 */
export interface CustomerAdminListQueryInput {
  /** Tìm theo tên, email */
  keyword?: string;
  /** Lọc theo khu vực hoạt động */
  location?: string;
  limit?: number;
  offset?: number;
}

/**
 * Input cho truy vấn lấy danh sách thợ gợi ý cho customer
 */
export interface CustomerRecommendQueryInput {
  limit?: number;
  offset?: number;
}

/**
 * Input cho truy vấn thống kê booking của customer (thực tế không cần filter)
 */
export type CustomerMyBookingSummaryQueryInput = Record<string, never>;
