# Lens Backend — Tổng quan dự án

> Tài liệu tổng hợp về mục tiêu, kiến trúc, domain, database, API, các luồng nghiệp vụ, hạ tầng và hướng phát triển của Lens Backend.

## 1. Giới thiệu

Lens là nền tảng kết nối **khách hàng có nhu cầu chụp ảnh** với **nhiếp ảnh gia chuyên nghiệp**. Backend chịu trách nhiệm cho toàn bộ vòng đời dịch vụ:

```text
Đăng nhập → Tìm nhiếp ảnh gia → Xem portfolio/lịch trống
→ Đặt lịch → Xác nhận booking → Thanh toán cọc
→ Chụp ảnh → Giao gallery → Thanh toán phần còn lại
→ Hoàn tất booking → Đánh giá
```

Ngoài hành trình chính, hệ thống còn hỗ trợ:

- Quản lý hồ sơ, portfolio và media của photographer.
- Quản lý lịch làm việc và thời gian không nhận booking.
- Thanh toán VietQR qua PayOS và nhận webhook đối soát.
- Giao ảnh riêng tư qua AWS S3 hoặc MinIO bằng presigned URL.
- Đánh giá, xếp hạng và thống kê photographer.
- Report, dispute, refund và các công cụ quản trị.
- Subscription/VIP dành cho photographer.
- Thông báo realtime qua Socket.IO và Transactional Outbox.

Repository này là **backend**, chưa bao gồm frontend web/mobile.

## 2. Mục tiêu hệ thống

### 2.1. Mục tiêu nghiệp vụ

1. Giúp khách hàng tìm được photographer phù hợp theo khu vực, phong cách, rating và lịch trống.
2. Giúp photographer trưng bày năng lực, quản lý lịch và nhận booking.
3. Bảo đảm booking không bị trùng lịch khi có nhiều request đồng thời.
4. Quản lý thanh toán cọc, thanh toán phần còn lại và đối soát webhook.
5. Bảo vệ ảnh và video bằng presigned URL, không công khai object storage trực tiếp.
6. Duy trì lịch sử trạng thái, giao dịch, report và sự kiện realtime để phục vụ vận hành.

### 2.2. Phạm vi hiện tại

- HTTP API bằng NestJS.
- PostgreSQL làm database chính.
- Keycloak làm Identity Provider và RBAC.
- PayOS làm payment gateway chính.
- S3/MinIO làm object storage.
- Redis dùng cho cache, queue và Socket.IO adapter.
- Socket.IO dùng cho thông báo realtime.
- CLI hỗ trợ seed, migration và các tác vụ vận hành.

## 3. Người dùng và vai trò

| Actor            | Trách nhiệm                                                                          |
| ---------------- | ------------------------------------------------------------------------------------ |
| Customer         | Tìm photographer, tạo booking, thanh toán, xem gallery và đánh giá.                  |
| Photographer     | Tạo hồ sơ, portfolio, quản lý lịch, nhận booking, giao ảnh và đăng ký VIP.           |
| Admin            | Quản lý user, booking, payment, report, refund và chính sách nền tảng.               |
| System           | Hoàn tất các tác vụ nền, phát realtime event và xử lý các bước yêu cầu quyền system. |
| Payment Provider | Gửi webhook xác nhận giao dịch từ PayOS hoặc provider tương thích.                   |

## 4. Các flow nghiệp vụ chính

### Flow 1 — Đăng ký, đăng nhập và hồ sơ người dùng

```text
Client
  → Keycloak/Google login hoặc đăng ký
  → Lens nhận access token
  → Provision user trong bảng users
  → Tạo customer/photographer profile khi cần
  → Người dùng cập nhật thông tin cá nhân
```

Các chức năng chính:

- Đăng ký tài khoản.
- Đăng nhập Google thông qua Keycloak Identity Broker.
- Lấy và cập nhật hồ sơ cá nhân.
- Kiểm tra JWT và role trước khi vào API protected.
- Admin có thể suspend, unsuspend hoặc ban user.

### Flow 2 — Photographer onboarding và portfolio

```text
Photographer đăng nhập
  → Tạo photographer profile
  → Cập nhật mô tả, khu vực, phong cách, trạng thái nhận booking
  → Upload media
  → Tạo portfolio
  → Gắn media vào portfolio
  → Portfolio xuất hiện ở trang public
```

Thông tin photographer gồm khu vực, mô tả, phong cách, năm bắt đầu nghề, trạng thái hoạt động và trạng thái xác minh.

> Lưu ý: database đã có trường verification_status và approved_by, nhưng API tracker hiện chưa có flow Admin approve/reject photographer riêng. Nếu yêu cầu nghiệp vụ bắt buộc photographer phải được duyệt trước khi nhận booking, cần bổ sung API và policy tương ứng.

### Flow 3 — Tìm kiếm photographer và xem lịch

```text
Customer
  → Tìm photographer theo từ khóa/khu vực/rating
  → Xem profile và portfolio
  → Xem lịch khả dụng
  → Chọn booking plan và thời gian chụp
```

Lịch khả dụng được tính từ:

- Các offline slot do photographer tự khóa.
- Các booking đang chiếm dụng lịch.
- Trạng thái hoạt động của photographer.

Các trạng thái booking chiếm dụng lịch hiện tại gồm pending, accepted, in_progress, shot và completed.

### Flow 4 — Booking lifecycle

```text
pending
  ├── accepted
  │     └── in_progress
  │            └── shot
  │                   └── completed
  ├── rejected
  └── cancelled
```

Chi tiết:

1. Customer tạo booking.
2. Hệ thống kiểm tra photographer, booking plan, thời gian bị khóa và booking trùng.
3. Photographer chấp nhận hoặc từ chối.
4. Customer thanh toán cọc.
5. Photographer bắt đầu buổi chụp sau khi đủ điều kiện thanh toán cọc.
6. Photographer xác nhận đã chụp xong.
7. Photographer giao và publish gallery.
8. Customer thanh toán phần còn lại.
9. System/Admin hoàn tất booking khi đã đủ tiền và gallery đã publish.

Khi tạo booking, hệ thống dùng **pessimistic write lock** trên photographer để hạn chế race condition và double booking.

### Flow 5 — Thanh toán booking

```text
Customer yêu cầu thanh toán
  → Tạo transaction intent
  → Tạo PayOS checkout/QR
  → Customer thanh toán
  → PayOS gửi webhook
  → Verify chữ ký và số tiền
  → Đánh dấu transaction paid
  → Phát payment.received
```

Quy tắc chính:

- Thanh toán cọc và thanh toán phần còn lại được lưu thành các transaction riêng.
- Thanh toán phần còn lại yêu cầu tiền cọc đã thành công.
- idempotency_key giúp tránh tạo transaction trùng khi client retry.
- payment_webhooks lưu reference đã xử lý để chống xử lý webhook lặp.
- Webhook được verify trước khi cập nhật transaction.
- Nếu payment đến sau khi booking đã bị hủy/từ chối, hệ thống tạo refund request để xử lý tiếp.

### Flow 6 — Upload, giao và tải gallery

```text
Photographer
  → Request presigned upload URL
  → Upload trực tiếp lên S3/MinIO
  → complete-upload
  → Storage verify object
  → Tạo gallery cho booking
  → Thêm media vào gallery
  → Publish gallery
  → Customer xem/tải ảnh bằng presigned download URL
```

Trạng thái media:

```text
pending → uploaded/ready → deleted
```

Media chỉ được xem khi:

- Chủ sở hữu có quyền truy cập.
- Media nằm trong portfolio public của photographer active.
- Media thuộc gallery đã publish của booking mà customer có quyền xem.

Presigned URL hiện có TTL mặc định khoảng 900 giây, tùy cấu hình storage.

### Flow 7 — Review và rating

```text
Booking completed
  → Customer tạo review
  → Hệ thống kiểm tra quyền customer
  → Tính lại average rating
  → Cập nhật photographer_ratings
```

Review chỉ được tạo sau khi booking ở trạng thái completed. Customer có thể sửa review trong thời gian cho phép; review bị ẩn sẽ không được tính vào rating public.

### Flow 8 — Report, dispute, refund và moderation

```text
Customer/Photographer tạo report
  → Admin xem danh sách/chi tiết
  → Resolve hoặc reject
  → Có thể suspend/ban user
  → Nếu liên quan payment thì tạo/duyệt refund
```

Report có thể nhắm tới user, booking, photographer, portfolio hoặc feedback. Report có evidence media và trạng thái open, escalated, resolved hoặc rejected.

### Flow 9 — Subscription/VIP cho photographer

Đây là flow mở rộng sau MVP:

```text
Photographer xem plans
  → Tạo subscription
  → Tạo transaction subscription
  → PayOS webhook
  → Kích hoạt subscription
  → Theo dõi usage/quota
  → Hủy auto-renew hoặc hết hạn
```

### Flow 10 — Realtime notification

Đây là flow hỗ trợ chạy xuyên suốt các flow trên:

```text
Nghiệp vụ và outbox event commit cùng transaction
  → Outbox worker quét event chưa xử lý
  → Socket.IO publisher phát tới user room
  → Client cập nhật UI realtime
```

Các event tiêu biểu:

- booking.created
- booking.accepted
- booking.rejected
- booking.cancelled
- booking.in_progress
- booking.shot
- booking.completed
- payment.received
- payment.subscription
- gallery.ready

## 5. Trạng thái booking và điều kiện hoàn tất

| Trạng thái  | Ý nghĩa                              | Actor thay đổi        |
| ----------- | ------------------------------------ | --------------------- |
| pending     | Customer đã gửi yêu cầu              | Customer/System       |
| accepted    | Photographer đã nhận booking         | Photographer          |
| rejected    | Photographer từ chối                 | Photographer          |
| cancelled   | Booking bị hủy theo business rule    | Customer/Photographer |
| in_progress | Buổi chụp đang diễn ra               | Photographer          |
| shot        | Đã hoàn thành buổi chụp              | Photographer          |
| completed   | Đã giao ảnh và đủ điều kiện hoàn tất | System/Admin          |

Điều kiện chính để chuyển sang completed:

- Booking đang ở trạng thái shot.
- Tổng tiền đã thanh toán đủ giá trị booking.
- Gallery đã được publish.

## 6. Kiến trúc hệ thống

Lens Backend sử dụng **Pragmatic Modular Monolith**, kết hợp các nguyên tắc Clean Architecture, DDD, CQRS và Ports & Adapters.

```text
[HTTP Client / Mobile / Web]
            │
            ▼
[Presentation / Delivery]
  Controllers, DTO, Guard, Swagger
            │
            ▼
[CQRS Application]
  CommandBus, QueryBus, Use Cases
            │
            ▼
[Domain]
  Business rules, status transition, validation
            │
            ▼
[Infrastructure]
  PostgreSQL, TypeORM, Keycloak, PayOS, S3, Redis
```

### 6.1. Presentation layer

Nằm trong src/features/api/:

- HTTP controllers.
- DTO và validation.
- Keycloak guard và actor context.
- Swagger/OpenAPI.
- Feature module wiring.

### 6.2. Application layer

Nằm trong src/modules/:

- *.command.ts: ghi và thay đổi trạng thái.
- *.query.ts: đọc dữ liệu.
- *.use-case.ts: điều phối nghiệp vụ và persistence.
- *.domain.ts: business rule thuần.
- ports/: contract giữa các bounded context.

Command handler mở transaction, truyền EntityManager vào use case và đảm bảo dữ liệu chính cùng outbox event commit trong một transaction.

### 6.3. Domain layer

Domain không phụ thuộc NestJS, TypeORM hoặc controller. Một số domain rule quan trọng:

- Booking transition.
- Kiểm tra booking hợp lệ và không trùng lịch.
- Payment callback và refund amount.
- Media ready/deleted/publish condition.
- Review chỉ được tạo sau booking completed.
- Subscription effective status.
- Report target và resolvable status.

### 6.4. Infrastructure layer

Nằm chủ yếu trong src/shared/:

- Database và TypeORM entities.
- Keycloak adapter.
- PayOS adapter.
- S3/MinIO adapter.
- Redis và Socket.IO adapter.
- Cookie, client context, config và error handling.

## 7. Bounded contexts và module

| Context      | Thư mục                  | Trách nhiệm                                                              |
| ------------ | ------------------------ | ------------------------------------------------------------------------ |
| Identity     | src/modules/identity     | User, customer, admin, profile và trạng thái tài khoản.                  |
| Photographer | src/modules/photographer | Hồ sơ photographer, tìm kiếm, rating summary và trạng thái nhận booking. |
| Portfolio    | src/modules/photographer | Album, media items, cover và thứ tự hiển thị.                            |
| Calendar     | src/modules/calendar     | Availability, offline slots và lịch cá nhân.                             |
| Booking      | src/modules/booking      | Vòng đời booking, status transition và dispute booking.                  |
| Payment      | src/modules/payment      | Transaction, PayOS, webhook, QR và refund.                               |
| Subscription | src/modules/subscription | Plans, subscriptions, expiry và usage/quota.                             |
| Media        | src/modules/media        | Upload, presigned URL, delivery gallery và download.                     |
| Feedback     | src/modules/feedback     | Review, visibility và rating recalculation.                              |
| Moderation   | src/modules/moderation   | Report, resolution và dashboard moderation.                              |

Các port liên context hiện có:

| Port                     | Bên cần                | Bên cung cấp |
| ------------------------ | ---------------------- | ------------ |
| RatingUpdaterPort        | Booking                | Review       |
| MediaOwnershipPort       | Photographer/Portfolio | Media        |
| SubscriptionPaymentsPort | Subscription           | Payment      |

## 8. Cấu trúc repository

```text
lens-backend/
├── apps/
│   ├── core/                  # HTTP application chính
│   └── cli/                   # CLI cho tác vụ quản trị
├── src/
│   ├── modules/               # Domain và application use cases
│   ├── features/
│   │   ├── api/               # Controller, DTO, auth, Swagger, module wiring
│   │   ├── socketio/          # Realtime gateway
│   │   └── workers/           # Outbox worker
│   └── shared/
│       ├── contracts/         # Input contracts
│       ├── database/          # Entity, config, helper
│       ├── integrations/      # Keycloak, PayOS, S3, realtime
│       └── platform/          # Context, cookie, env, error handling
├── migrations/                # SQL migration
├── scripts/                   # Seed, migration, secrets, setup
├── test/                      # Unit, integration, OpenAPI, boundary tests
├── docs/                      # Tài liệu dự án
└── .docker/                   # Docker Compose và init scripts
```

## 9. Database và dữ liệu

Database chính là PostgreSQL. Schema khởi tạo nằm tại migrations/001_lens.sql; script pnpm db:migrate theo dõi checksum trong lens_migrations và không chạy lại migration đã áp dụng. TypeORM dùng synchronize: false.

### 9.1. Nhóm bảng chính

| Nhóm                | Bảng                                                            |
| ------------------- | --------------------------------------------------------------- |
| Tài khoản           | users, customers, admins, photographers, photographer_ratings   |
| Gói và lịch         | booking_plans, photographer_plans, subscriptions, offline_slots |
| Booking và nội dung | bookings, booking_deliveries, media, portfolios, feedbacks      |
| Tài chính           | wallets, transactions, payment_webhooks, refund_requests        |
| Quản trị và hạ tầng | reports, outbox_events                                          |

Tổng cộng hiện có 20 bảng nghiệp vụ và hạ tầng theo tài liệu database.

### 9.2. Quy ước dữ liệu

- ID dùng UUID.
- Timestamp dùng timestamptz.
- Tiền VND lưu dạng bigint, sau đó transformer thành number trong application.
- Một số trường có cấu trúc JSONB như portfolio items, plan features, gallery media IDs và report evidence IDs.
- Request/response API dùng snake_case.
- Thời gian truyền qua API nên ở định dạng ISO 8601 có timezone.

### 9.3. Transactional Outbox

Khi một nghiệp vụ tạo event realtime:

1. Lưu dữ liệu nghiệp vụ chính.
2. Lưu event vào outbox_events.
3. Commit cả hai trong cùng transaction.
4. Worker đọc event chưa xử lý.
5. Publisher phát event tới Socket.IO user room.

Cơ chế này tránh tình trạng database đã commit nhưng notification bị mất do ghi database và gửi realtime ở hai thao tác độc lập.

> Hạn chế hiện tại: worker đánh dấu event đã xử lý trước khi gọi publisher. Nếu publisher lỗi sau đó, event không tự retry. Khi triển khai nhiều replica hoặc yêu cầu delivery cao hơn, cần bổ sung cơ chế claim/lease, retry và dead-letter.

## 10. API overview

API hiện được theo dõi trong docs/api-tracker.json với **80 operations**.

### Identity & User

- POST /auth/register
- GET /users/me
- PATCH /users/me
- GET /users/:id
- GET /keycloak/google/login
- GET /keycloak/google/callback

### Photographer

- POST /photographers/profile
- GET /photographers/:id
- PATCH /photographers/me
- PATCH /photographers/me/status
- GET /photographers
- GET /photographers/top-rated
- GET /photographers/me
- PATCH /photographers/me/location

### Portfolio

- POST /photographers/me/portfolios
- GET /photographers/:id/portfolios
- GET /portfolios/:id
- PATCH /portfolios/:id
- DELETE /portfolios/:id
- POST /portfolios/:id/items
- DELETE /portfolios/:id/items/:itemId
- PATCH /portfolios/:id/items/reorder

### Calendar

- GET /photographers/:id/availability
- GET /calendar/me
- POST /calendar/blocked-times
- DELETE /calendar/blocked-times/:id

### Booking

- POST /bookings
- GET /bookings/:id
- GET /bookings
- POST /bookings/:id/accept
- POST /bookings/:id/reject
- POST /bookings/:id/cancel
- POST /bookings/:id/start
- POST /bookings/:id/complete-shoot
- POST /bookings/:id/complete
- GET /bookings/:id/timeline
- POST /bookings/:id/dispute

### Payment

- POST /bookings/:id/payments/deposit
- POST /bookings/:id/payments/remaining
- GET /bookings/:id/payments
- GET /payments/:id
- GET /payments/:id/qr
- POST /payments/webhooks/:provider
- POST /payments/:id/refund
- GET /payments/:id/refunds

### Media & Gallery

- POST /media/upload-url
- POST /media/complete-upload
- GET /media/:id
- DELETE /media/:id
- POST /bookings/:id/gallery
- POST /bookings/:id/gallery/items
- GET /bookings/:id/gallery
- POST /bookings/:id/gallery/publish
- GET /bookings/:id/gallery/download

### Review

- POST /bookings/:id/reviews
- GET /photographers/:id/reviews
- GET /photographers/:id/rating-summary
- PATCH /reviews/:id
- DELETE /reviews/:id

### Subscription

- GET /plans
- POST /subscriptions
- GET /subscriptions/me
- POST /subscriptions/:id/cancel
- GET /subscriptions/me/usage
- POST /subscriptions/webhooks/:provider

### Trust & Safety

- POST /reports
- GET /reports/me
- GET /admin/reports
- GET /admin/reports/:id
- POST /admin/reports/:id/resolve
- POST /admin/users/:id/suspend
- POST /admin/users/:id/unsuspend

### Admin

- GET /admin/dashboard
- GET /admin/users
- GET /admin/users/:id
- PATCH /admin/users/:id/status
- GET /admin/bookings
- GET /admin/payments
- GET /admin/photographers
- POST /admin/users/:id/ban

Swagger UI mặc định ở /docs; OpenAPI JSON ở /docs-json.

## 11. Tích hợp bên ngoài

### Keycloak

Keycloak chịu trách nhiệm:

- OIDC/OAuth2.
- JWT access token.
- Google Identity Broker.
- Role và quyền truy cập.
- JWKS/token validation.

Flow Google login được mô tả chi tiết tại docs/keycloak-google-login.md.

### PayOS

PayOS được dùng để:

- Tạo checkout link.
- Sinh QR thanh toán.
- Verify webhook.
- Đối soát amount và order code.

Không hard-code credential thật trong source. Các biến môi trường cần thiết được mô tả tại docs/SECRETS_GUIDE.md.

### S3/MinIO

Object storage dùng để lưu ảnh/video. Backend chỉ quản lý metadata và sinh presigned URL; client upload/download trực tiếp với storage.

Các bước upload chuẩn:

1. Backend tạo media record và presigned upload URL.
2. Client upload object.
3. Client gọi complete upload.
4. Backend verify object theo key, MIME type và file size.

### Redis

Redis được dùng cho:

- Cache.
- BullMQ/queue.
- Socket.IO Redis adapter.
- Chia sẻ realtime room khi có nhiều instance.

## 12. Bảo mật và phân quyền

- API protected sử dụng Keycloak guard.
- Actor được xây dựng từ token và role.
- Use case kiểm tra ownership trước khi đọc hoặc ghi dữ liệu.
- Payment webhook phải verify chữ ký và reference.
- Idempotency key chống tạo transaction trùng.
- Presigned URL giới hạn thời gian sống.
- Media không được truy cập chỉ bằng cách biết UUID.
- Database dùng transaction cho các nghiệp vụ thay đổi nhiều bảng.
- Không bật TypeORM auto-sync trong môi trường thật.
- Secrets được cấu hình qua environment/SOPS/Age, không commit credential thật.

## 13. Hạ tầng chạy local

Docker Compose trong .docker/compose.yaml cung cấp các service chính:

- PostgreSQL.
- Redis.
- MinIO.
- Keycloak và một số service mở rộng khi bật full profile.

Các lệnh thường dùng:

```bash
pnpm install
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm start:dev
```

Các lệnh khác:

```bash
pnpm docker:down
pnpm docker:restart
pnpm docker:status
pnpm docker:logs
pnpm build
pnpm build:all
pnpm start:prod
pnpm start:cli
```

Nếu cần Keycloak/Kong local, bật Docker Compose với profile full và cấu hình .env tương ứng.

## 14. Cấu hình môi trường

Các nhóm biến môi trường chính:

| Nhóm       | Ví dụ biến                                                                             |
| ---------- | -------------------------------------------------------------------------------------- |
| HTTP       | PORT, CORS_ORIGINS, API_PUBLIC_URL                                                     |
| PostgreSQL | DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, DATABASE_URL                      |
| Redis      | REDIS_HOST, REDIS_PORT, REDIS_PASSWORD                                                 |
| Keycloak   | KEYCLOAK_AUTH_SERVER_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID, KEYCLOAK_SECRET          |
| Google     | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, KEYCLOAK_GOOGLE_REDIRECT_URI                   |
| PayOS      | PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY, PAYOS_RETURN_URL, PAYOS_CANCEL_URL |
| S3/MinIO   | S3_MINIO_ENDPOINT, S3_MINIO_ACCESS_KEY_ID, S3_MINIO_SECRET_ACCESS_KEY, S3_MINIO_BUCKET |

Feature module có thể bật/tắt bằng các biến dạng FEATURE_NAME_ENABLED, ví dụ FEATURE_BOOKING_ENABLED hoặc FEATURE_PAYMENT_ENABLED.

## 15. Kiểm thử và chất lượng

Các nhóm test hiện có:

- Unit test cho identity use case.
- Integration test cho Lens API.
- OpenAPI contract test.
- Domain boundary test để kiểm tra ranh giới import giữa các layer.

Lệnh kiểm thử:

```bash
pnpm typecheck
pnpm test
pnpm test:cov
pnpm test:openapi
pnpm test:integration
pnpm test:e2e
```

Integration test cần database riêng, ví dụ lens_test. Không dùng credential production cho test.

## 16. Đề xuất thứ tự triển khai MVP

### Phase 1 — Nền tảng

- Keycloak authentication.
- User/customer/photographer profile.
- Database migration và seed.
- Swagger và validation.

### Phase 2 — Marketplace

- Photographer search.
- Portfolio/media.
- Calendar và availability.

### Phase 3 — Booking core

- Tạo booking.
- Accept/reject/cancel.
- Status transition.
- Chống double booking.

### Phase 4 — Payment và delivery

- Deposit payment.
- PayOS webhook.
- Remaining payment.
- S3/MinIO upload.
- Gallery publish/download.

### Phase 5 — Trust và vận hành

- Review/rating.
- Report/dispute.
- Refund.
- Admin dashboard.
- Realtime notification.

### Phase 6 — Tăng trưởng

- Photographer subscription/VIP.
- Usage/quota.
- Ranking nâng cao.
- Analytics.
- Retry/dead-letter cho outbox.

## 17. Các điểm cần hoàn thiện hoặc kiểm tra thêm

1. Bổ sung flow và endpoint Admin approve/reject photographer nếu cần verification bắt buộc.
2. Xác nhận chính sách refund theo từng nguyên nhân hủy booking và thời điểm hủy.
3. Bổ sung idempotency và concurrency test cho payment webhook, booking và refund.
4. Cải thiện Outbox Worker để có retry, lease/claim và dead-letter.
5. Kiểm tra cơ chế hoàn tất booking tự động thay vì phụ thuộc System/Admin.
6. Xác định rõ thời điểm bắt buộc thanh toán phần còn lại: trước khi publish gallery, sau khi publish hay trước khi complete.
7. Bổ sung audit log cho thao tác Admin, refund, ban/suspend và moderation.
8. Cấu hình rate limit cho auth, upload URL, payment intent và webhook.
9. Bổ sung virus scan, file dimension validation và quota enforcement cho media.
10. Khi chạy nhiều instance, kiểm tra toàn bộ Redis adapter, worker ownership và duplicate event.
11. Đồng bộ API tracker, controller, Swagger và frontend contract sau mỗi lần thay đổi API.

## 18. Tài liệu liên quan

- [README dự án](../README.md)
- [Kiến trúc](ARCHITECTURE_GUIDE.md)
- [Hướng dẫn triển khai backend](backend-implementation.md)
- [Quyết định database](database-decisions.md)
- [Đăng nhập Google qua Keycloak](keycloak-google-login.md)
- [Secrets và environment](SECRETS_GUIDE.md)
- [API tracker](api-tracker.json)

## 19. Tóm tắt một câu

Lens Backend là một **modular monolith NestJS** dùng PostgreSQL, Keycloak, PayOS, S3/MinIO, Redis và Socket.IO để quản lý trọn vẹn vòng đời kết nối khách hàng với photographer: từ khám phá, đặt lịch, thanh toán, chụp, giao ảnh đến đánh giá và xử lý tranh chấp.
