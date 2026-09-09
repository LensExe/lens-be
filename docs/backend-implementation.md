# Lens backend — NestJS / Clean Architecture / DDD / CQRS

## Phạm vi

File `Lens_API_Progress_Tracker.xlsm` được cung cấp hiện có 87 mục: 86 HTTP endpoint và một WebSocket event (`LOC-005`). Toàn bộ 86 HTTP endpoint đều được triển khai. Working tree đang giữ thêm 8 HTTP endpoint và 7 realtime/event contract của chat/notification từ snapshot tracker đã có trước đó; vì vậy [api-tracker.json](api-tracker.json) là contract mở rộng gồm 102 mục và Swagger hiện có 94 HTTP operation. Không thay đổi file Excel. Các ghi chú phân công, tiến độ và hướng dẫn dùng workbook không được thực thi như chỉ dẫn lập trình.

Các quyết định schema và chính sách mặc định được ghi trước khi triển khai tại [database-decisions.md](database-decisions.md). Migration [001_lens.sql](../migrations/001_lens.sql) dành cho database mới; không tự động chạy trên database đang có của bạn.

## Cấu trúc code

```text
src/modules/<bounded-context>/
  domain/                       Entity, enum, repository contract và invariant
  application/
    commands/                   Command + @CommandHandler cho luồng ghi
    queries/                    Query + @QueryHandler cho luồng đọc
    <context>.ts                Use case của bounded context
  infrastructure/              ORM entity, mapper và repository adapter hiện có
src/shared/
  contracts/                    Input contract không phụ thuộc HTTP
  database/records/             Typed record bám schema
  database/unit-of-work/        Session/UnitOfWork port và PostgreSQL adapter
  integrations/                 Keycloak, S3, PayOS, notification adapter
src/features/
  api/http/                     Controller mỏng dùng CommandBus/QueryBus
  api/modules/                  Module HTTP nhỏ theo từng bounded context
  api/api-runtime.module.ts     Hạ tầng dùng chung: CQRS, auth, adapter, realtime
  api/feature-modules.ts        Composition theo biến FEATURE_*_ENABLED
  api/api.module.ts             Bundle tùy chọn để nạp toàn bộ module đang bật
  api/dto.ts                    DTO validation + Swagger request schema
  api/responses.ts              Endpoint response schema
  api/auth/                     Keycloak guard và access metadata
  socketio/                     Realtime gateway
  workers/                      Outbox worker
```

Luồng ghi: Controller → CommandBus → CommandHandler → Use case/domain → repository port → PostgreSQL transaction. Luồng đọc: Controller → QueryBus → QueryHandler → use case → read-only transaction. Application không import TypeORM, SDK S3, PayOS hoặc controller/DTO của Presentation. Domain không import NestJS.

Các module/controller scaffold cũ không có trong các `*ApiModule` sẽ không được đăng ký. `apps/core` là composition root và import từng HTTP feature module từ `src/features`; domain, application và infrastructure dùng chung nằm trong `src/modules` và `src/shared`.

### Bật/tắt từng nhóm endpoint

Mặc định cả 13 API module đều bật. Đặt biến tương ứng thành đúng chuỗi `false` rồi khởi động lại process để bỏ toàn bộ controller, CQRS handler và route HTTP của module đó khỏi ứng dụng và Swagger:

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
FEATURE_NOTIFICATION_ENABLED=false
FEATURE_CHAT_ENABLED=false
FEATURE_LOCATION_ENABLED=false
```

Danh sách module nằm tại [modules](../src/features/api/modules/index.ts), còn [feature-modules.ts](../src/features/api/feature-modules.ts) chỉ chọn module theo cấu hình. Vì vậy controller vẫn thuộc Presentation trong `src/features`, không bị gom hoặc sao chép sang `apps/core`.

Nếu không muốn dùng biến môi trường, có thể import rời rạc trực tiếp tại composition root và bỏ `enabledApiFeatureModules`:

```ts
import { IdentityApiModule, BookingApiModule } from '@features/api/modules';

@Module({
  imports: [
    EnvModule,
    DatabaseModule,
    ApiRuntimeModule,
    IdentityApiModule,
    BookingApiModule,
  ],
})
export class CoreModule {}
```

`ApiRuntimeModule` là hạ tầng chung bắt buộc cho các API module. `ApiModule` chỉ là bundle tiện dụng cho contract test hoặc trường hợp muốn nạp tất cả module đang bật; `CoreModule` hiện không phụ thuộc bundle này. Swagger được sinh từ module thực tế đã nạp, nên module bị tắt cũng biến mất khỏi `/docs` và `/docs-json`.

## Cài đặt và chạy

Node.js 22.12+ hoặc Node.js 24 được khuyến nghị theo dependency đã cài. Các package Nest runtime được đồng bộ lên 12 vì repo ban đầu trộn common/core 11 với CQRS/Swagger/TypeORM integration 12, gây lỗi import runtime. CLI build hiện có vẫn dùng được. `ioredis` được đồng bộ với peer dependency của TypeORM.

```bash
pnpm install
# Điền các biến trong lens.env.example vào .env hiện tại.
# Không ghi đè .env đang có nếu còn cấu hình khác cần giữ.
pnpm db:migrate
pnpm start:dev
```

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- Khi deploy, đặt `API_PUBLIC_URL=https://your-api-host` để nút **Try it out** gọi đúng backend online. Nếu để trống, Swagger dùng cùng origin với trang `/docs`.
- HTTP API không có prefix `/api`; path khớp workbook, ví dụ `/bookings`.
- Các response thành công HTTP dùng 200, bao gồm create/delete. DTO và Swagger thống nhất hợp đồng này.
- Request/response sử dụng snake_case, UUID và ISO 8601 có múi giờ. Ví dụ `2026-12-01T09:00:00+07:00`. `limit` 1–100, mặc định 20; `offset` mặc định 0.
- `DB_SYNCHRONIZE` bị vô hiệu hóa trong code; migration quản lý schema. Bảng kỹ thuật `lens_migrations` ghi checksum để phát hiện sửa migration đã chạy.
- Cần tạo dữ liệu BookingPlan/PhotographerPlan trước khi test đặt lịch/subscription. [demo-plans.sql](../migrations/demo-plans.sql) là seed tùy chọn, chỉ chạy khi bạn muốn thêm dữ liệu demo.

## Keycloak

Điền các biến có comment `TODO: INSERT_KEYCLOAK_*` trong [lens.env.example](../lens.env.example) và tham khảo [keycloak.service.ts](../src/shared/integrations/keycloak/keycloak.service.ts).

1. Tạo realm và API client. `KEYCLOAK_AUTH_SERVER_URL` là URL ngoài của Keycloak, không gồm `/realms/...`, không có dấu `/` cuối.
2. Tạo frontend public client với Authorization Code + PKCE, cấu hình redirect URI của frontend.
3. Thêm audience mapper để access token có `aud` bằng `KEYCLOAK_CLIENT_ID` của API.
4. Tạo/gán các role viết thường: `customer`, `photographer`, `admin`, `system`, `internal`. API nhận realm roles hoặc resource roles của API client. Không nhận role từ body.
5. Bật email claim trong token. Lấy **access token**, bấm Authorize trong Swagger rồi nhập token. Không dùng ID token.
6. Gọi `POST /auth/register` với `fullname`, sau đó `GET /users/me`. Photographer tiếp tục `POST /photographers/profile`.

`POST /auth/register` tạo hồ sơ nội bộ sau đăng ký ở IdP; endpoint này không tạo tài khoản/mật khẩu trong Keycloak. Dù workbook ghi Public, endpoint vẫn yêu cầu token hợp lệ để không cho mạo danh `keycloak_id`. Nó không yêu cầu User đã tồn tại. Chạy lại không tạo User trùng. Service account cho Internal/System cũng cần hồ sơ nội bộ trước khi gọi API.

Xác thực kiểm tra chữ ký RS256 bằng JWKS có cache/rate limit, issuer, audience, expiration, subject và `typ=Bearer`. Thiếu cấu hình bị từ chối; không có nhánh decode-only. User bị suspend trong DB sẽ bị chặn ở HTTP và thao tác WebSocket tiếp theo.

## Booking và payment

Luồng thử nghiệm:

1. Photographer tạo `POST /calendar/availability` với khoảng UTC cụ thể.
2. Customer chọn plan từ `GET /plans` → `booking_plans`, tạo `POST /bookings`.
3. Photographer gọi `/bookings/:id/accept`.
4. Customer gọi `/bookings/:id/payments/deposit`, giữ nguyên `idempotency_key` khi retry.
5. Callback PayOS xác thực thành công mới đánh dấu paid. Redirect URL frontend không xác nhận thanh toán.
6. Photographer gọi `/start`, `/complete-shoot`, tạo và publish gallery.
7. Customer thanh toán `/payments/remaining`.
8. Admin/System gọi `/complete`. Customer có thể tạo review.

Giá booking và kỳ subscription được snapshot. Cọc 30%, làm tròn lên VND. PostgreSQL transaction + advisory lock dùng chung giữa các instance để bảo vệ tạo booking trùng lịch, state transition, callback và giới hạn refund. Đây là lựa chọn nhất quán đơn giản cho bản đầu; lock toàn bộ command sẽ giới hạn throughput, có thể thay bằng khóa từng aggregate và constraint exclusion khi tải tăng.

Payment intent được **commit trước khi gọi PayOS**. Timeout không làm mất order code. Retry đọc intent cũ và tra cứu order ở PayOS, không tạo thêm khoản thu. SDK GET của PayOS không trả chuỗi VietQR ban đầu: khi phục hồi sau timeout, `qr_code` có thể null và `checkout_url` dẫn tới trang thanh toán PayOS đã tồn tại. Cần thử với kênh PayOS thật sau khi điền credentials.

Webhook nhận JSON gốc ở root, không bọc `payload`:

```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": { "orderCode": 100000, "amount": 300000, "reference": "..." },
  "signature": "..."
}
```

Đây chỉ là minh họa cấu trúc; callback thật phải có đầy đủ trường/chữ ký của PayOS. Cấu hình callback tới `/payments/webhooks/payos` hoặc `/subscriptions/webhooks/payos`. Hai adapter dùng chung consumer idempotent, chọn booking/subscription theo transaction trong DB, không theo dữ liệu chủ sở hữu từ callback.

`POST /payments/:id/refund` tạo **yêu cầu hoàn tiền** ở trạng thái `requested`, bảo vệ tổng số tiền đã yêu cầu. Nó không tuyên bố đã chuyển tiền về ngân hàng. Quy trình phê duyệt/chi trả hoàn tiền của nhà cung cấp nằm ngoài contract hiện có. Callback trả tiền cho booking đã hủy tạo yêu cầu hoàn tiền để xử lý.

## Media, notification và realtime

Storage: điền S3/MinIO credentials, bucket private và bucket CORS cho frontend PUT. Upload URL gắn key do server sinh, content type/length, thời hạn 900 giây. `complete-upload` dùng HEAD kiểm tra object; không chỉ tin metadata client gửi. Media gắn với gallery/portfolio/message không được xóa tùy tiện. Gallery chưa publish chỉ photographer sở hữu được xem. Download gallery trả danh sách signed URL, không tạo ZIP. Signed URL đã cấp có hiệu lực đến khi hết hạn.

Notification: outbox được ghi cùng transaction của booking/payment/gallery. Worker xử lý tối đa 50 event/lượt, tạo notification center idempotent và phát Socket.IO sau commit. `NOTIFICATION_CHANNELS=email,push` bật adapter SMTP/FCM; để trống dùng notification center + realtime. Điền SMTP, FCM project và service-account credentials khi bật. FCM token UNREGISTERED được loại bỏ. Provider lỗi thì event còn pending để retry. Email/push là at-least-once: khi provider đã nhận nhưng process chết trước commit có thể gửi lặp; frontend dùng `event_id` để deduplicate, SMTP dùng Message-ID ổn định. Không bảo đảm exactly-once qua nhà cung cấp bên ngoài.

Socket.IO namespace `/lens`, kết nối bằng `auth: { token: accessToken }`. Server tự join room theo User đã xác thực; client không được chọn room/user nhận. Mỗi event xác minh lại token, trạng thái tài khoản và membership.

| Mục tracker | Event                         | Payload / xử lý                                                                                                                    |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| CHAT-004    | `message.send`                | `{id: conversationId, client_message_id: UUID, content: string}`; ACK `{ok,data}` hoặc `{ok:false,error}`. Phát `message.created`. |
| CHAT-005    | `message.read`                | `{id: conversationId, message_id: UUID}`; cập nhật read receipt, phát `message.read`.                                              |
| CHAT-006    | `typing.start`, `typing.stop` | `{id: conversationId}`; chỉ participant.                                                                                           |
| CHAT-007    | `presence.update`             | `{id: conversationId, active: boolean}`; trạng thái phiên do participant thông báo.                                                |
| LOC-005     | `booking.location.updated`    | Server phát sau `POST /bookings/:id/location/update` thành công. Không nhận tọa độ từ event client riêng.                          |
| NOTI-005    | `booking.*`                   | Consumer outbox tạo notification, gửi kênh đã cấu hình.                                                                            |
| NOTI-006    | `payment.*`                   | Cùng consumer, chống notification trùng event.                                                                                     |
| NOTI-007    | `gallery.ready`               | Cùng consumer sau publish gallery.                                                                                                 |

Swagger/OpenAPI mô tả HTTP, không phải trình test Socket.IO; sử dụng socket.io-client với bảng trên. Chat/notification hiện là bounded context trong cùng Nest process. Realtime dùng Socket.IO adapter mặc định trong một process; khi chạy nhiều replica phải thêm Redis adapter trước khi dựa vào delivery giữa các replica. Notification center và lịch sử tin nhắn là dữ liệu bền vững để client đồng bộ lại sau reconnect.

## Kiểm thử

```bash
pnpm typecheck
pnpm build
LENS_TEST_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/lens_test pnpm test:integration
```

Tests yêu cầu database riêng tên `lens_test`, tự tạo/xóa schema UUID riêng; không reset database hiện tại. Test S3 thật bật bằng `LENS_TEST_S3_ENDPOINT=http://127.0.0.1:PORT` trỏ tới MinIO tạm có credential `lens-test` / `lens-test-only`. Không dùng credentials này ngoài test.

Test bao gồm đối chiếu 94 operation Swagger, guard/validation, phân quyền, booking đồng thời, payment retry/callback, gallery, rating, subscription, portfolio, chat realtime, outbox và JWT RSA/JWKS thật. PayOS/SMTP/FCM trong test dùng adapter thay thế, không gọi tài khoản thật. S3 adapter được kiểm thử PUT/HEAD/GET/DELETE với MinIO khi biến test được cung cấp.

`scripts/generate-lens-contract.py` lưu ánh xạ endpoint → use case và DTO để có thể tái tạo các adapter/handler. Khi thay đổi contract, sửa script, chạy lại và format. Logic nghiệp vụ viết tay không nằm trong generator. Migration và response schema phải được cập nhật tương ứng.

Các nguồn kỹ thuật đã đối chiếu: [NestJS CQRS](https://docs.nestjs.com/recipes/cqrs), [Keycloak OIDC](https://www.keycloak.org/securing-apps/oidc-layers), [PayOS API](https://payos.vn/docs/api/), [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api), [Nodemailer SMTP](https://nodemailer.com/smtp).
