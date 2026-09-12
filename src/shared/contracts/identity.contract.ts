/**
 * Input cho lệnh đăng ký tài khoản mới vào hệ thống backend (sau khi đã xác thực Keycloak).
 * Dùng để khởi tạo bản ghi user, customer profile và ví (wallet).
 */
export interface IdentityCustomerRegisterCommandInput {
  /** Họ và tên đầy đủ của người dùng */
  fullname: string;
  /** Địa chỉ / khu vực hoạt động (tùy chọn) */
  location?: string;
}

/**
 * Input cho truy vấn lấy thông tin cá nhân của người dùng hiện tại (Me).
 * Không cần tham số đầu vào vì thông tin xác thực được lấy từ Actor (Token).
 */
export type IdentityMeQueryInput = Record<string, never>;

/**
 * Input cho lệnh cập nhật thông tin cá nhân của người dùng đang đăng nhập.
 * Tất cả các trường đều là tùy chọn (optional).
 */
export interface IdentityUpdateMeCommandInput {
  /** Họ và tên mới */
  fullname?: string;
  /** Đường dẫn URL ảnh đại diện */
  avatar_url?: string;
  /** Số điện thoại liên hệ */
  phone_number?: string;
  /** Giới tính */
  gender?: 'male' | 'female' | 'other';
  /** Ngày tháng năm sinh (định dạng ISO string hoặc YYYY-MM-DD) */
  dob?: string;
}

/**
 * Input cho truy vấn lấy thông tin công khai của một người dùng theo ID.
 */
export interface IdentityGetUserQueryInput {
  /** ID (UUID) của người dùng cần xem thông tin */
  id: string;
}

/**
 * Input cho truy vấn danh sách người dùng (dành cho Admin).
 * Hỗ trợ phân trang, lọc theo trạng thái và tìm kiếm theo từ khóa.
 */
export interface IdentityAdminUsersQueryInput {
  /** Số lượng bản ghi tối đa trả về trên một trang (mặc định: 20) */
  limit?: number;
  /** Vị trí bắt đầu lấy bản ghi để phân trang (mặc định: 0) */
  offset?: number;
  /** Lọc theo trạng thái tài khoản: 'active' (đang hoạt động) hoặc 'suspended' (bị đình chỉ) */
  status?: 'active' | 'suspended';
  /** Từ khóa tìm kiếm (khớp theo tên, email, v.v.) */
  keyword?: string;
}

/**
 * Input cho truy vấn lấy chi tiết đầy đủ của một người dùng theo ID (dành cho Admin).
 */
export interface IdentityAdminUserQueryInput {
  /** ID (UUID) của người dùng cần xem chi tiết */
  id: string;
}

/**
 * Input cho lệnh cập nhật trạng thái người dùng (dành cho Admin).
 */
export interface IdentityStatusCommandInput {
  /** ID (UUID) của người dùng cần đổi trạng thái */
  id: string;
  /** Trạng thái mới cần cập nhật: 'active' hoặc 'suspended' */
  status: 'active' | 'suspended';
}

/**
 * Input cho lệnh cấm / ban vĩnh viễn tài khoản người dùng (dành cho Admin).
 */
export interface IdentityAdminBanCommandInput {
  /** ID (UUID) của người dùng cần cấm */
  id: string;
}

/**
 * Input cho lệnh đình chỉ / khóa tài khoản người dùng (dành cho Admin).
 */
export interface IdentitySuspendCommandInput {
  /** ID (UUID) của người dùng cần đình chỉ */
  id: string;
}

/**
 * Input cho lệnh mở khóa / kích hoạt lại tài khoản người dùng (dành cho Admin).
 */
export interface IdentityUnsuspendCommandInput {
  /** ID (UUID) của người dùng cần mở khóa */
  id: string;
}
