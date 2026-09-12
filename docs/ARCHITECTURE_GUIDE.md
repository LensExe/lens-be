# Kiến trúc Lens Backend

Lens Backend dùng Clean Architecture tinh gọn theo bounded context, NestJS/CQRS cho lớp giao tiếp, và TypeORM `EntityManager` trong application use case. Ranh giới chính là: domain chỉ xử lý dữ liệu và quy tắc; use case điều phối I/O, quyền truy cập, lưu dữ liệu và sự kiện. Đây là biến thể thực dụng: use case phụ thuộc TypeORM, còn domain độc lập TypeORM/NestJS.

## Cây thư mục

```text
apps/
  core/src/                    Composition root và entrypoint HTTP
  cli/src/                     Lệnh chạy riêng
src/
  modules/<context>/           Nghiệp vụ theo bounded context
    *.domain.ts                Quy tắc thuần, không I/O (chỉ tạo khi có quy tắc)
    *.use-case.ts              Điều phối use case bằng EntityManager
    *.command.ts               Command và CommandHandler cho ghi
    *.query.ts                 Query và QueryHandler cho đọc
    ports/                     Hợp đồng do context này cần từ context khác
  features/
    api/http/                  Controller HTTP
    api/modules/               NestJS module ghép controller và handler
    api/auth/                  Guard và metadata xác thực HTTP
    api/api-runtime.module.ts  Ghép use case, port và adapter
    api/dto/                   DTO/validation request theo nhóm API
    api/swagger/               Record schema và response schema OpenAPI
    api/responses.ts           Barrel export cho schema OpenAPI
    socketio/                  Gateway realtime
    workers/                   Outbox worker
  shared/
    contracts/                 Input contract độc lập HTTP
    domain/                    Giá trị/quy tắc thuần thật sự dùng chung
    database/entities/         TypeORM entity, mỗi bảng một file
    database/                  DatabaseModule và helper truy cập dữ liệu
    integrations/              Keycloak, PayOS, S3, realtime
    platform/                  Auth, cấu hình và xử lý lỗi chung
    common/                    Helper application hiện dùng
migrations/                    Migration SQL
docs/                          Tài liệu dự án
test/                          Kiểm thử
```

Không bắt buộc mọi context có `*.domain.ts` hoặc `ports/`: chỉ thêm khi có quy tắc thuần hoặc phụ thuộc cần đảo chiều. Command/query nằm trực tiếp trong context, nhận biết bằng hậu tố file.

## Ranh giới và luồng xử lý

```text
POST /bookings
  → BookingController (HTTP, DTO, auth)
  → CommandBus → BookingsCommandHandler (mở transaction)
  → BookingUseCases.create(EntityManager, actor, input)
  → đọc dữ liệu bằng EntityManager
  → Booking.prepare(facts) trong booking.domain.ts
  → lưu booking và ghi outbox bằng cùng EntityManager/transaction
  → commit → OutboxWorker phát realtime
```

- `*.domain.ts`: hàm/quy tắc thuần; nhận facts/giá trị, trả kết quả hoặc lỗi nghiệp vụ. Không inject service, gọi DB/API, phát sự kiện hoặc biết controller. Ví dụ [`booking.domain.ts`](../src/modules/booking/booking.domain.ts) quyết định tạo booking hợp lệ và chuyển trạng thái; [`identity.domain.ts`](../src/modules/identity/identity.domain.ts) quyết định chuyển trạng thái tài khoản.
- `*.use-case.ts`: lấy facts từ database, gọi domain, điều phối nhiều bước, kiểm tra quyền và lưu kết quả. `EntityManager` được truyền từ handler; các command và query handler hiện đều mở `DataSource.transaction()`.
- `*.command.ts` / `*.query.ts`: adapter CQRS mỏng, chuyển input từ bus vào use case. Handler sở hữu ranh giới transaction, không chứa quy tắc nghiệp vụ.
- `src/features/`: adapter đầu vào (HTTP) và đầu ra (realtime/worker), cùng wiring NestJS. TypeORM entity trong `src/shared/database/entities/` là mô hình lưu trữ; không đặt quy tắc domain vào entity này.

## Port giữa các context

Port là hợp đồng cho một khả năng mà **module tiêu thụ** cần. Đặt port tại `src/modules/<module-tiêu-thụ>/ports/`, không gom tất cả vào `shared`. Module cung cấp có thể dùng một use-case class thực hiện nhiều port; NestJS `useExisting` ánh xạ từng token về cùng một instance. Chỉ tách adapter riêng khi nó có trách nhiệm/nguồn dữ liệu riêng.

| Module tiêu thụ        | Port                       | Bên cung cấp                |
| ---------------------- | -------------------------- | --------------------------- |
| Booking                | `RatingUpdaterPort`        | `ReviewUseCases` (feedback) |
| Photographer/Portfolio | `MediaOwnershipPort`       | `MediaUseCases`             |
| Subscription           | `SubscriptionPaymentsPort` | `PaymentUseCases`           |

Wiring nằm tại [`api-runtime.module.ts`](../src/features/api/api-runtime.module.ts). Use case tiêu thụ inject port, không inject trực tiếp use case của module khác. Đây là lời gọi đồng bộ khi cần kết quả ngay hoặc phải dùng cùng `EntityManager`/transaction. Tác vụ realtime được ghi vào outbox trong transaction rồi worker phát sau commit. Worker hiện đánh dấu `processed_at` trước khi gọi publisher; nếu publisher thất bại sau bước đó, sự kiện không tự được retry. Không coi outbox hiện tại là cơ chế bảo đảm phát đúng một lần.

Port của tích hợp bên ngoài có phạm vi toàn ứng dụng, như `PaymentGateway` và `RealtimePublisher`, nằm trong `src/shared/integrations/`. Mã domain chung chỉ đặt ở `src/shared/domain/` nếu thật sự không thuộc riêng context nào, ví dụ giá trị khoảng thời gian/tiền dùng bởi booking, calendar và payment.

## Quy tắc phụ thuộc

```text
features → modules/use-case + modules/ports → modules/domain + shared/domain
                                   ↓
                       EntityManager + shared/integrations
```

Domain không import từ `features`, use case, `platform`, TypeORM hoặc NestJS; lỗi nghiệp vụ thuần là `src/shared/domain/domain.error.ts`. Use case có thể dùng TypeORM và infrastructure chung nhưng không import trực tiếp use case của context khác. Provider có thể `import type` port để TypeScript kiểm tra hợp đồng; runtime injection nằm ở composition root. Tránh đặt quy tắc nghiệp vụ mới trong controller, handler hoặc TypeORM entity.

`CoreModule` chọn HTTP feature module theo `FEATURE_<NAME>_ENABLED`; tên hiện tại: `IDENTITY`, `PHOTOGRAPHER`, `PORTFOLIO`, `BOOKING`, `PAYMENT`, `CALENDAR`, `MEDIA`, `REVIEW`, `SUBSCRIPTION`, `MODERATION`. Xem [phân chia module](MODULES_BREAKDOWN.md) cho tên file và ownership.
