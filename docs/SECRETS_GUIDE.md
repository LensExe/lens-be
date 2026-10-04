# Secrets và biến môi trường

`EnvModule` nạp `.env` qua NestJS `ConfigModule`. PostgreSQL, Redis, Keycloak và các cổng thanh toán dùng cấu hình ở [`env.config.ts`](../src/shared/platform/env/env.config.ts); S3 đọc cấu hình riêng trong adapter. Cấu hình mặc định trong mã chỉ phục vụ phát triển: luôn cấp credentials riêng, đủ mạnh cho môi trường triển khai.

| Nhóm       | Biến chính                                                                                                                              | Nơi sử dụng                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Ứng dụng   | `PORT`, `CORS_ORIGINS`, `API_PUBLIC_URL`                                                                                                | HTTP, Swagger, WebSocket                                  |
| PostgreSQL | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` hoặc `DATABASE_URL` cho migration                                         | TypeORM và script migration                               |
| Redis      | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`                                                                                            | Cache/trạng thái OIDC                                     |
| Keycloak   | `KEYCLOAK_AUTH_SERVER_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_SECRET`, `KEYCLOAK_GOOGLE_REDIRECT_URI`                   | JWT, Google login                                         |
| PayOS      | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PAYOS_RETURN_URL`, `PAYOS_CANCEL_URL`                                        | Tạo thanh toán và xác minh webhook                        |
| Payment    | `PAYMENT_PROVIDER` (`payos`/`sepay`, mặc định `payos`)                                                                                  | Chọn provider cho payment mới                             |
| SePay      | `SEPAY_ACCOUNT_NUMBER`, `SEPAY_BANK_CODE`, `SEPAY_WEBHOOK_API_KEY`; `SEPAY_ACCOUNT_NAME` tùy chọn                                       | Tạo QR nhận tiền và xác minh webhook                      |
| Payout     | `PAYOUT_DESTINATION_ENCRYPTION_KEY` (ít nhất 32 ký tự)                                                                                  | Mã hóa thông tin ngân hàng nhận tiền                      |
| Thông báo  | `NOTIFICATION_SERVICE_URL`                                                                                                              | Email OTP; thiếu thì trả 503                              |
| Kafka      | `KAFKA_ENABLED`, `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_NOTIFICATION_EVENTS_TOPIC`, `KAFKA_USERNAME`, `KAFKA_PASSWORD`, `KAFKA_SSL` | Producer gửi outbox notification tới notification-service |
| S3/MinIO   | `S3_PROVIDER` (`minio`/`cloud`), `S3_MINIO_*` hoặc `S3_CLOUD_*`                                                                         | Object storage và presigned URL                           |

Google setup còn cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `KEYCLOAK_ADMIN_USERNAME`, `KEYCLOAK_ADMIN_PASSWORD`; xem [hướng dẫn Google login](keycloak-google-login.md). Danh sách biến S3 chính xác nằm tại [`s3.config.ts`](../src/shared/integrations/s3/s3.config.ts).

`S3_PROVIDER=minio` dùng MinIO; `S3_PROVIDER=cloud` dùng S3-compatible cloud được cấu hình bằng `S3_CLOUD_*`. Nếu không khai báo `S3_PROVIDER`, ứng dụng mặc định chọn MinIO ở development và cloud ở production.

`PAYMENT_PROVIDER` chọn gateway tạo payment intent. Webhook vẫn được route riêng theo URL `/payments/webhooks/:provider`. Với `sepay`, cấu hình đúng số tài khoản/mã ngân hàng nhận tiền và `SEPAY_WEBHOOK_API_KEY` để đối chiếu webhook. `PAYOUT_DESTINATION_ENCRYPTION_KEY` phải ổn định giữa các lần deploy; đổi khóa sẽ khiến thông tin payout đã lưu không giải mã được.

`KAFKA_ENABLED` mặc định là `false`; khi bật, Lens dùng Transactional Outbox để gửi các notification type đã được notification-service hỗ trợ lên `notification.events`. Host producer dùng `localhost:9092`; container trong cùng Kafka network thường dùng `kafka:9094`; container kết nối Kafka trên host dùng `host.docker.internal:19092`. Bật SASL bằng cách khai báo cả `KAFKA_USERNAME` và `KAFKA_PASSWORD`; bật TLS riêng bằng `KAFKA_SSL=true`. Notification-service phải bật consumer, tạo sẵn topic và dùng cùng contract/type. Các event Lens chưa có type tương ứng vẫn đi qua Socket.IO trong giai đoạn chuyển tiếp.

`.env` là plaintext cục bộ và không được commit. Kho mã có file SOPS/Age mã hóa tại `.stacks/dev/runtime/env/app.env.enc` cùng các script `scripts/secrets-auto.mjs`, `scripts/stack-secret.mjs`, `scripts/sync.mjs`. Các script này có thể ghi `.env` hoặc file mã hóa; xem lệnh và file đích trước khi chạy. Hook `pre-commit` hiện chạy `npx lint-staged`, không tự động mã hóa secrets.

`.docker/compose.yaml` chứa credential dev cố định; tác vụ `minio-init` chỉ bật tải xuống anonymous cho prefix `public/`. Object thuộc prefix `private/` vẫn cần Presigned GET URL. Không dùng file Compose này nguyên trạng ngoài môi trường phát triển.

Giữ khóa giải mã ngoài repository, chia sẻ qua kênh bảo mật của nhóm. Trước khi commit, kiểm tra staged diff để không đưa `.env`, token, private key hoặc file plaintext khác vào Git. Thay credential ngay nếu nghi bị lộ.
