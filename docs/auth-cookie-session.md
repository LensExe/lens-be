# Phiên đăng nhập trên trình duyệt

Portal và admin gửi `X-Lens-Auth-Mode: cookie` cùng `withCredentials: true` khi gọi API. Với header này, backend đặt access token và refresh token trong cookie `HttpOnly; SameSite=Strict`; access cookie hết hạn theo `expires_in`, refresh cookie có thời hạn tối đa 30 ngày. Login, register, Google exchange và refresh không trả token trong JSON. Các client không gửi header này vẫn dùng hợp đồng Bearer token hiện tại.

Request thay đổi dữ liệu bằng cookie auth phải gửi `X-CSRF-Token`, khớp với cookie `csrf_token`. Các request chỉ đọc dữ liệu không cần header CSRF. `CORS_ORIGINS` phải liệt kê chính xác origin của portal và admin; không dùng wildcard khi bật credentials. Khi frontend và API nằm ở các subdomain, đặt `COOKIE_DOMAIN` thành domain cha để frontend đọc được cookie CSRF; token auth vẫn host-only trên host API.

Frontend lưu một cookie đọc được chứa thông tin hồ sơ tối thiểu để dựng giao diện sau reload (`lens.portal.session`, `lens.admin.session`). Giá trị này chỉ phục vụ giao diện; backend xác thực và phân quyền bằng access token `HttpOnly`. Dữ liệu token cũ trong `localStorage` được xóa, refresh token cũ được đổi một lần sang cookie khi app khởi động.

WebSocket thông báo cần chấp nhận cookie `keycloak_access_token` trong handshake Socket.IO. Nếu Socket.IO được triển khai ở dịch vụ riêng, dịch vụ đó phải cùng site hoặc có cấu hình cookie/CORS credentials tương ứng.
