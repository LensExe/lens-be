# Chạy và kiểm thử Lens Backend

`apps/core` là ứng dụng HTTP NestJS; [api-tracker.json](api-tracker.json) theo dõi 80 operation. Cây mã nguồn, ranh giới domain/use case và port được mô tả tại [kiến trúc](ARCHITECTURE_GUIDE.md). Schema PostgreSQL và quy trình migration nằm tại [database](database-decisions.md).

## Cấu trúc lúc chạy

```text
apps/core/src/                 Khởi động NestJS, chọn HTTP feature module
src/features/api/http/        Controller HTTP
src/features/api/dto/         Validation và request DTO theo nhóm API
src/features/api/swagger/     Schema OpenAPI
src/features/api/modules/     Ghép controller với CQRS handler
src/features/api/auth/        Guard Keycloak và Google callback service
src/features/socketio/        Gateway realtime
src/features/workers/         Outbox worker
src/modules/                  Domain, use case, command/query handler, port
src/shared/database/          TypeORM entity và cấu hình PostgreSQL
src/shared/integrations/      Keycloak, PayOS, S3 và realtime port
```

Controller gọi `CommandBus`/`QueryBus`; handler hiện mở `DataSource.transaction()` và truyền `EntityManager` vào use case. Use case lấy dữ liệu, gọi quy tắc domain thuần, lưu kết quả và ghi outbox nếu có sự kiện. Domain không gọi TypeORM hoặc NestJS. Port liên context được nối tại [`ApiRuntimeModule`](../src/features/api/api-runtime.module.ts).

## Chạy cục bộ

```bash
pnpm install
pnpm docker:up
# Cấu hình .env cho dịch vụ cục bộ trước khi chạy migration.
pnpm db:migrate
pnpm start:dev
```

`pnpm docker:up` dùng Docker Compose mặc định; Keycloak và Kong thuộc profile `full` nên cần `docker compose -f .docker/compose.yaml --profile full up -d` nếu muốn chạy chúng cục bộ. Khi chạy app trên host, đặt port Redis/DB trong `.env` theo các port được expose trong `.docker/compose.yaml`.

Lệnh và script có trong [`package.json`](../package.json). Migration không tự chạy khi ứng dụng khởi động; `DB_SYNCHRONIZE` không bật TypeORM auto-sync. `001_lens.sql` chỉ khởi tạo database mới, không phải migration nâng cấp database đã có dữ liệu.

Swagger UI ở `/docs`, OpenAPI JSON ở `/docs-json`; mặc định server lắng nghe `PORT=3000`. Khi triển khai, `API_PUBLIC_URL` có thể đặt URL server cho Swagger “Try it out”. `CORS_ORIGINS` là danh sách origin cách nhau bằng dấu phẩy. Các route HTTP hiện đặt tại root, ví dụ `POST /bookings`. Request và response dùng snake_case; tiền là số nguyên VND; thời gian gửi vào API là ISO 8601 có múi giờ.

## Bật/tắt HTTP feature

Mặc định 10 feature module được nạp. Đặt biến tương ứng thành đúng chuỗi `false` rồi khởi động lại để không nạp controller và CQRS handler của feature đó:

```dotenv
FEATURE_IDENTITY_ENABLED=false
FEATURE_PHOTOGRAPHER_ENABLED=false
FEATURE_PORTFOLIO_ENABLED=false
FEATURE_BOOKING_ENABLED=false
FEATURE_PAYMENT_ENABLED=false
FEATURE_CALENDAR_ENABLED=false
FEATURE_MEDIA_ENABLED=false
FEATURE_REVIEW_ENABLED=false
FEATURE_SUBSCRIPTION_ENABLED=false
FEATURE_MODERATION_ENABLED=false
```

Danh sách và logic chọn module ở [`feature-modules.ts`](../src/features/api/feature-modules.ts). Swagger được tạo từ module thực tế đã nạp, nên route bị tắt không xuất hiện trong tài liệu API. `ApiModule` gom các module đang bật cho kiểm thử và môi trường cần nạp cả API.

## Xác thực và tài khoản

API dùng Keycloak access token. Guard kiểm tra token và quyền; `POST /auth/register` tạo user, customer profile và wallet nội bộ cho actor đã xác thực. Lệnh có tính idempotent với tài khoản đang `active`; tài khoản bị đình chỉ/ban không được đăng ký lại. Các thao tác trạng thái admin (`active`, `suspended`, `banned`) đi qua `identity.domain.ts`; admin không thể tự khóa/ban chính mình. Google login đi qua Keycloak theo [hướng dẫn riêng](keycloak-google-login.md).

## Booking, payment và subscription

`POST /bookings` nhận photographer, booking plan, địa điểm và khoảng thời gian. Use case lấy photographer/plan/lịch, domain kiểm tra khả dụng, trùng lịch, ngày nghỉ và tính cọc 30% (làm tròn lên VND). Photographer có thể accept/reject; các bước start, complete-shoot và complete kiểm tra trạng thái và payment cần thiết. Các command dùng PostgreSQL transaction; tạo booking khóa bản ghi photographer bằng pessimistic write lock.

`POST /bookings/:id/payments/deposit` và `/remaining` tạo hoặc lấy lại transaction intent theo loại thanh toán. Intent được commit trước khi gọi PayOS; nếu bước gọi nhà cung cấp thất bại, transaction/order code vẫn còn để retry. PayOS adapter thử tra order hiện hữu sau lỗi tạo link; đường dẫn checkout phục hồi có thể không kèm QR gốc. Chỉ webhook đã xác minh chữ ký và số tiền mới đánh dấu transaction `paid`. Các URL redirect của frontend không xác nhận thanh toán.

Webhook PayOS nhận JSON gốc ở `POST /payments/webhooks/payos` hoặc `POST /subscriptions/webhooks/payos`. `payment_webhooks` ghi `(provider, reference)` để xử lý callback lặp; callback subscription cập nhật subscription tương ứng. `POST /payments/:id/refund` tạo yêu cầu hoàn tiền, không thực hiện chuyển tiền cho người dùng. Subscription chụp giá và kỳ hạn khi tạo; payment dùng port do Subscription sở hữu. Chi tiết route/request/response xem Swagger.

## Media và realtime

Object storage hỗ trợ MinIO và S3-compatible cloud. Presigned URL dùng TTL mặc định 900 giây, có thể cấu hình theo provider; `complete-upload` kiểm tra object với storage. Bucket và CORS phải cho phép upload theo cấu hình frontend. Xem [biến môi trường](SECRETS_GUIDE.md) và [`s3.config.ts`](../src/shared/integrations/s3/s3.config.ts).

Sự kiện nghiệp vụ được ghi vào `outbox_events` trong transaction. Worker quét tối đa 50 event mỗi lượt, cách 2 giây, rồi phát qua Socket.IO namespace `/lens` tới room của user đã xác thực. Client gửi `auth: { token: accessToken }`. Worker hiện đánh dấu event đã xử lý **trước khi** gọi publisher; lỗi publisher xảy ra sau đó không được retry tự động. Không dựa vào outbox hiện tại để bảo đảm delivery đúng một lần hoặc nhiều replica cùng phát an toàn.

## Kiểm thử

```bash
pnpm typecheck
pnpm build
node -r ts-node/register -r tsconfig-paths/register --test test/domain-boundaries.test.ts test/identity-use-case.test.ts
pnpm test:openapi
LENS_TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/lens_test pnpm test:integration
```

Integration test yêu cầu database riêng tên `lens_test`; test tạo/xóa schema UUID trong database đó, không reset database ứng dụng. `LENS_TEST_S3_ENDPOINT` cho phép chạy thêm kiểm thử MinIO thật. Kiểm thử OpenAPI đối chiếu route đã nạp với tracker. Không dùng credentials production cho test.
