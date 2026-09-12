# Secrets và biến môi trường

`EnvModule` nạp `.env` qua NestJS `ConfigModule`. PostgreSQL, Redis và Keycloak dùng cấu hình ở [`env.config.ts`](../src/shared/platform/env/env.config.ts); PayOS và S3 còn đọc trực tiếp các biến môi trường trong adapter tương ứng. Cấu hình mặc định trong mã chỉ phục vụ phát triển: luôn cấp credentials riêng, đủ mạnh cho môi trường triển khai.

| Nhóm       | Biến chính                                                                                                            | Nơi sử dụng                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Ứng dụng   | `PORT`, `CORS_ORIGINS`, `API_PUBLIC_URL`                                                                              | HTTP, Swagger, WebSocket           |
| PostgreSQL | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` hoặc `DATABASE_URL` cho migration                       | TypeORM và script migration        |
| Redis      | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`                                                                          | Cache/trạng thái OIDC              |
| Keycloak   | `KEYCLOAK_AUTH_SERVER_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_SECRET`, `KEYCLOAK_GOOGLE_REDIRECT_URI` | JWT, Google login                  |
| PayOS      | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PAYOS_RETURN_URL`, `PAYOS_CANCEL_URL`                      | Tạo thanh toán và xác minh webhook |
| S3/MinIO   | `S3_MINIO_*` hoặc `S3_CLOUD_*`                                                                                        | Object storage và presigned URL    |

Google setup còn cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `KEYCLOAK_ADMIN_USERNAME`, `KEYCLOAK_ADMIN_PASSWORD`; xem [hướng dẫn Google login](keycloak-google-login.md). Danh sách biến S3 chính xác nằm tại [`s3.config.ts`](../src/shared/integrations/s3/s3.config.ts).

`.env` là plaintext cục bộ và không được commit. Kho mã có file SOPS/Age mã hóa tại `.stacks/dev/runtime/env/app.env.enc` cùng các script `scripts/secrets-auto.mjs`, `scripts/stack-secret.mjs`, `scripts/sync.mjs`. Các script này có thể ghi `.env` hoặc file mã hóa; xem lệnh và file đích trước khi chạy. Hook `pre-commit` hiện chạy `npx lint-staged`, không tự động mã hóa secrets.

`.docker/compose.yaml` chứa credential dev cố định; tác vụ `minio-init` còn bật tải xuống anonymous cho bucket local. Không dùng file Compose này nguyên trạng ngoài môi trường phát triển và không coi bucket local là private.

Giữ khóa giải mã ngoài repository, chia sẻ qua kênh bảo mật của nhóm. Trước khi commit, kiểm tra staged diff để không đưa `.env`, token, private key hoặc file plaintext khác vào Git. Thay credential ngay nếu nghi bị lộ.
