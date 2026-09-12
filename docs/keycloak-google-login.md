# Đăng nhập Google qua Keycloak

Google là Identity Provider của Keycloak. Lens không nhận Google token trực tiếp: trình duyệt đi qua Keycloak, còn backend chỉ đổi và xác minh Keycloak access token. Hai endpoint HTTP hiện tại là `GET /keycloak/google/login` và `GET /keycloak/google/callback`.

## Cấu hình

Đặt trong `.env` của môi trường chạy backend và script setup:

```dotenv
KEYCLOAK_AUTH_SERVER_URL=https://keycloak.example.com
KEYCLOAK_REALM=lens
KEYCLOAK_CLIENT_ID=lens-be
KEYCLOAK_SECRET=<client-secret>
KEYCLOAK_ADMIN_USERNAME=<admin-username>
KEYCLOAK_ADMIN_PASSWORD=<admin-password>
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
KEYCLOAK_GOOGLE_REDIRECT_URI=https://api.example.com/keycloak/google/callback
```

`KEYCLOAK_GOOGLE_REDIRECT_URI` là URL callback **của Lens**, phải khớp URL công khai mà trình duyệt truy cập, kể cả prefix do reverse proxy thêm. Có hai redirect URI khác nhau:

1. Lens callback: giá trị `KEYCLOAK_GOOGLE_REDIRECT_URI`; Keycloak dùng nó để trả authorization code về Lens.
2. Keycloak broker callback: script in ra sau khi setup; khai báo giá trị này trong Google Cloud Console ở **Authorized redirect URIs**.

Sau khi Keycloak sẵn sàng, chạy `pnpm keycloak:google:setup`. [`configure-keycloak-google.mjs`](../scripts/configure-keycloak-google.mjs) tạo/cập nhật realm client, audience mapper và Google Identity Provider. Script cần quyền admin Keycloak và có thể thay đổi cấu hình client/IdP; kiểm tra biến môi trường đích trước khi chạy.

## Luồng đăng nhập

1. Client gọi `GET /keycloak/google/login` và mở `authorization_url` trả về.
2. Lens tạo state + PKCE, lưu bundle dùng một lần trong Redis trong 10 phút; URL chuyển trình duyệt qua Keycloak/Google.
3. Keycloak trả `code` và `state` về `GET /keycloak/google/callback` của Lens.
4. Lens tiêu thụ state, đổi code lấy Keycloak token, xác minh access token rồi tạo hồ sơ local nếu là lần đăng nhập đầu.
5. Callback trả token set Keycloak và hồ sơ user. Client dùng access token cho các API cần xác thực.

State đã dùng hoặc hết hạn bị từ chối. Callback trả token trong JSON, vì vậy chỉ dùng HTTPS khi triển khai; không ghi token vào log hoặc URL khác. Xem [secrets](SECRETS_GUIDE.md) và [triển khai backend](backend-implementation.md) cho cấu hình chung.
