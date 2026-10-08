# Đăng nhập Google qua Keycloak

Google là Identity Provider của Keycloak. Lens không nhận Google token trực tiếp: trình duyệt đi qua Keycloak, còn backend chỉ đổi và xác minh Keycloak access token. Hai endpoint HTTP hiện tại là `GET /keycloak/google/login` và `GET /keycloak/google/callback`.

## Cấu hình

Đặt trong `.env` của môi trường chạy backend và script setup:

```dotenv
KEYCLOAK_AUTH_SERVER_URL=https://keycloak.example.com
KEYCLOAK_REALM=lens
KEYCLOAK_CLIENT_ID=lens-be
KEYCLOAK_SECRET=<client-secret>
KEYCLOAK_ADMIN_CLIENT_ID=lens-backend-admin
KEYCLOAK_ADMIN_CLIENT_SECRET=<service-account-client-secret>
KEYCLOAK_ADMIN_USERNAME=<admin-username>
KEYCLOAK_ADMIN_PASSWORD=<admin-password>
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
KEYCLOAK_GOOGLE_REDIRECT_URI=https://api.example.com/keycloak/google/callback
KEYCLOAK_GOOGLE_FRONTEND_REDIRECT_URI=https://app.example.com/auth/google/callback
```

`KEYCLOAK_GOOGLE_REDIRECT_URI` là URL callback **của Lens**, phải khớp URL công khai mà trình duyệt truy cập, kể cả prefix do reverse proxy thêm. Có hai redirect URI khác nhau:

1. Lens callback: giá trị `KEYCLOAK_GOOGLE_REDIRECT_URI`; Keycloak dùng nó để trả authorization code về Lens.
2. Keycloak broker callback: script in ra sau khi setup; khai báo giá trị này trong Google Cloud Console ở **Authorized redirect URIs**.

Sau callback, backend redirect về `KEYCLOAK_GOOGLE_FRONTEND_REDIRECT_URI` với một mã handoff dùng một lần. Frontend gọi `GET /keycloak/google/exchange?code=...` để lấy token và hồ sơ người dùng. Mã hết hạn sau 60 giây và không thể dùng lại.

Sau khi Keycloak sẵn sàng, chạy `pnpm keycloak:google:setup`. [`configure-keycloak-google.mjs`](../scripts/configure-keycloak-google.mjs) tạo/cập nhật realm client, service account quản trị user, audience mapper và Google Identity Provider. Script cần quyền admin Keycloak và có thể thay đổi cấu hình client/IdP; kiểm tra biến môi trường đích trước khi chạy. `KEYCLOAK_ADMIN_USERNAME` và `KEYCLOAK_ADMIN_PASSWORD` chỉ dùng để chạy script setup; backend runtime lấy token bằng `KEYCLOAK_ADMIN_CLIENT_ID` và `KEYCLOAK_ADMIN_CLIENT_SECRET`.

## Luồng đăng nhập

1. Client gọi `GET /keycloak/google/login` và mở `authorization_url` trả về.
2. Lens tạo state + PKCE, lưu bundle dùng một lần trong Redis trong 10 phút; URL chuyển trình duyệt qua Keycloak/Google.
3. Keycloak trả `code` và `state` về `GET /keycloak/google/callback` của Lens.
4. Lens tiêu thụ state, đổi code lấy Keycloak token, xác minh access token rồi tạo hồ sơ local nếu là lần đăng nhập đầu.
5. Backend redirect về frontend với mã handoff; frontend đổi mã qua endpoint exchange và dùng access token cho các API cần xác thực.

State đã dùng hoặc hết hạn bị từ chối. Mã handoff chỉ tồn tại trong Redis 60 giây và chỉ dùng được một lần. Xem [secrets](SECRETS_GUIDE.md) và [triển khai backend](backend-implementation.md) cho cấu hình chung.
