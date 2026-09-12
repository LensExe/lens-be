/**
 * Đại diện cho chủ thể (người dùng/hệ thống) đang thực hiện request,
 * được trích xuất trực tiếp từ payload của Keycloak JWT Access Token.
 */
export interface Actor {
  /**
   * Subject Identifier (User ID bên phía Keycloak - định dạng UUID).
   * Dùng làm khóa ngoại `keycloak_id` để liên kết bản ghi tài khoản giữa Keycloak và Database backend.
   */
  sub: string;

  /**
   * Địa chỉ email của người dùng được xác thực từ Keycloak.
   * Dùng để gán email khi đăng ký tài khoản hoặc gửi thông báo. (Có thể optional nếu token không chứa scope email).
   */
  email?: string;

  /**
   * Họ và tên hiển thị (preferred_username / full name) lấy từ hồ sơ Keycloak.
   */
  name?: string;

  /**
   * Danh sách vai trò (roles) được cấp cho người dùng trong Keycloak Realm hoặc Client (ví dụ: ['admin', 'customer', 'photographer']).
   * Dùng cho việc phân quyền truy cập (RBAC) thông qua hàm kiểm tra `role(actor, 'admin')` hoặc Guard.
   */
  roles: string[];
}
