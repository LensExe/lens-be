# Lens Backend 📸

[![NestJS](https://img.shields.io/badge/NestJS-12.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3-FE0808?style=for-the-badge&logo=typeorm&logoColor=white)](https://typeorm.io/)
[![Keycloak](https://img.shields.io/badge/Keycloak-IAM-4D798B?style=for-the-badge&logo=redhat&logoColor=white)](https://www.keycloak.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20Queue-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

> **Lens Platform** — Nền tảng kết nối trực tiếp Nhiếp ảnh gia chuyên nghiệp (Photographers) và Khách hàng có nhu cầu chụp ảnh (Customers).

---

## 📌 Mục lục

1. [Tổng quan hệ thống](#-tổng-quan-hệ-thống)
2. [Công nghệ sử dụng (Tech Stack)](#-công-nghệ-sử-dụng-tech-stack)
3. [Kiến trúc & Mẫu thiết kế (Architecture & Design Patterns)](#-kiến-trúc--mẫu-thiết-kế-architecture--design-patterns)
4. [Phân ranh giới Domain & Nghiệp vụ (Domain & Bounded Contexts)](#-phân-ranh-giới-domain--nghiệp-vụ-domain--bounded-contexts)
5. [Cấu trúc mã nguồn (Project Structure)](#-cấu-trúc-mã-nguồn-project-structure)
6. [Bắt đầu nhanh (Quick Start & Local Setup)](#-bắt-đầu-nhanh-quick-start--local-setup)
7. [Bật/tắt tính năng (Feature Flags)](#-bậttắt-tính-năng-feature-flags)
8. [Kiểm thử & Đảm bảo chất lượng (Testing & Quality Assurance)](#-kiểm-thử--đảm-bảo-chất-lượng-testing--quality-assurance)
9. [Tài liệu tham khảo (Documentation Index)](#-tài-liệu-tham-khảo-documentation-index)
10. [Triển khai (Deployment)](#-triển-khai-deployment)

---

## 🌟 Tổng quan hệ thống

**Lens Backend** được thiết kế dưới dạng **Pragmatic Modular Monolith** kết hợp triết lý **Clean Architecture / Domain-Driven Design (DDD)**. Hệ thống cung cấp API cho ứng dụng Web và Mobile phục vụ toàn bộ chu trình từ đăng ký, tìm kiếm thợ ảnh, đặt lịch, giữ cọc, quản lý lịch làm việc, thanh toán tích hợp ngân hàng (VietQR), bàn giao ảnh qua Cloud Storage, đến đánh giá và giải quyết khiếu nại.

### Điểm nổi bật về mặt kỹ thuật:

- **Strict Type Safety**: Sử dụng TypeScript với cấu hình strict cao nhất, `nodenext` module resolution.
- **ACID & Concurrency Safe**: Sử dụng PostgreSQL Explicit Transactions kết hợp Pessimistic Locking để loại trừ hoàn toàn rủi ro trùng lịch (double booking).
- **Guaranteed Event Delivery**: Ứng dụng mô hình **Transactional Outbox Pattern** để phát thông báo Realtime mà không gặp lỗi Dual-Write.
- **Zero-Trust Secrets**: Hỗ trợ quản lý và mã hóa secrets tự động với Mozilla SOPS & Age key.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

| Phân tầng / Khía cạnh         | Công nghệ & Thư viện                                 | Mô tả vai trò                                                                               |
| :---------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| **Framework nền tảng**        | **NestJS 12** (Node.js v20+)                         | Framework backend kiến trúc module, DI (Dependency Injection), Pipes, Interceptors, Guards. |
| **Ngôn ngữ**                  | **TypeScript 5.9**                                   | Đảm bảo kiểu dữ liệu tĩnh nghiêm ngặt trên toàn bộ hệ thống.                                |
| **Kiến trúc ứng dụng**        | **Pragmatic Clean Architecture + CQRS**              | Tách bạch Domain thuần, Application Use Cases, và Infrastructure qua `@nestjs/cqrs`.        |
| **Cơ sở dữ liệu chính**       | **PostgreSQL 16**                                    | Lưu trữ dữ liệu quan hệ, đảm bảo tính toàn vẹn và giao dịch ACID.                           |
| **ORM & Data Mapping**        | **TypeORM 0.3**                                      | Quản lý Entity, Repository, EntityManager và Pessimistic Locking.                           |
| **Migration**                 | **Raw SQL Script** (`scripts/migrate-lens.cjs`)      | Áp dụng schema SQL chủ động, có kiểm soát, không bật auto-sync trên môi trường thật.        |
| **Identity & Access (IAM)**   | **Keycloak 24**                                      | Quản lý định danh tập trung (OAuth2/OIDC, JWT Bearer Token, Google Identity Broker, RBAC).  |
| **Cổng thanh toán**           | **PayOS (VietQR)**                                   | Tạo mã thanh toán QR động, liên kết thanh toán tức thời, xác thực chữ ký HMAC Webhook.      |
| **Lưu trữ tệp (Storage)**     | **AWS S3 / MinIO** (`@aws-sdk/client-s3`)            | Lưu trữ ảnh gốc, ảnh portfolio, ảnh sản phẩm với cơ chế Presigned URL bảo mật có TTL.       |
| **Realtime**                  | **Socket.IO** (`@nestjs/platform-socket.io`)         | Kênh thông báo trực tiếp hai chiều cho Web/App theo từng User Room qua namespace `/lens`.   |
| **Background Worker**         | **Transactional Outbox Worker** + **BullMQ / Redis** | Quét sự kiện ngầm, điều phối hàng đợi tác vụ và tác vụ định kỳ.                             |
| **API Docs & Contract**       | **OpenAPI 3.0 / Swagger** (`@nestjs/swagger`)        | Tự động sinh tài liệu API tương tác tại `/docs`, kiểm thử hợp đồng tự động.                 |
| **Bảo mật biến môi trường**   | **Mozilla SOPS & Age**                               | Mã hóa an toàn các biến môi trường nhạy cảm ngay trên Git repo.                             |
| **Quản lý gói & Chạy Docker** | **pnpm** & **Docker Compose**                        | Quản lý dependencies tối ưu dung lượng và đóng gói môi trường phát triển cục bộ.            |

---

## 🏛️ Kiến trúc & Mẫu thiết kế (Architecture & Design Patterns)

Hệ thống tuân thủ chặt chẽ các nguyên lý thiết kế nâng cao:

```text
[HTTP Client / Frontend]
        │
        ▼
[Delivery / Presentation Layer]
   ├── HTTP Controllers (Routing, Auth Guard, DTO Validation)
   └── Swagger / OpenAPI Registry (Response Schema)
        │
        ▼
[Application Layer (CQRS)]
   ├── CommandBus / QueryBus (@nestjs/cqrs)
   ├── Command Handlers (Mở DataSource Transaction)
   ├── Query Handlers (Tối ưu truy vấn đọc dữ liệu)
   └── Ports (Interfaces định nghĩa hợp đồng liên context)
        │
        ▼
[Domain Layer (Pure Business Logic)]
   ├── Domain Entities & Business Rules (e.g. Booking.prepare, Status Transition)
   └── KHÔNG phụ thuộc vào NestJS, TypeORM hay bất kỳ thư viện bên ngoài nào
        │
        ▼
[Infrastructure & Persistence Layer]
   ├── TypeORM Entities & Database Repositories
   ├── Adapters: Keycloak, PayOS, S3/MinIO, Realtime Gateway
   └── Transactional Outbox Worker (Quét outbox_events phát Realtime)
```

### 1. Phân tách Command - Query (CQRS)

- **Command (`*.command.ts`)**: Đại diện cho các thao tác **Ghi (Write)** làm biến đổi trạng thái. Command Handler chủ động mở transaction DB, nạp dữ liệu, thực thi quy tắc domain và lưu kết quả cùng sự kiện Outbox.
- **Query (`*.query.ts`)**: Đại diện cho các thao tác **Đọc (Read)**. Trực tiếp truy vấn và ánh xạ dữ liệu theo DTO trả về, tối ưu hiệu năng đọc mà không phải tải toàn bộ domain model.

### 2. Transactional Outbox Pattern (Giải quyết triệt để Dual-Write)

Khi có sự kiện quan trọng (ví dụ: `booking.created`, `payment.success`):

1. Nghiệp vụ lưu dữ liệu chính (bảng `bookings`) và ghi sự kiện vào bảng `outbox_events` **trong cùng một Database Transaction**.
2. Khi transaction commit thành công, API trả ngay phản hồi `200 OK` cho người dùng mà không bị nghẽn mạng.
3. [`OutboxWorker`](src/features/workers/outbox.worker.ts) chạy nền định kỳ quét các sự kiện chưa xử lý và phát qua Socket.IO tới đúng người nhận. Nếu Socket/mạng gián đoạn, sự kiện vẫn an toàn trong DB để retry.

### 3. Hexagonal Architecture (Ports & Adapters)

Khi một domain context cần dữ liệu hoặc dịch vụ từ context khác (ví dụ: `Payment` cần tính giá từ `Subscription`, `Booking` cần kiểm tra `Calendar`), nó định nghĩa một Interface Port trong thư mục `ports/`. Việc ghép nối Adapter cụ thể được thực hiện tại tầng ngoài cùng ([`ApiRuntimeModule`](src/features/api/api-runtime.module.ts)), giúp các module hoàn toàn độc lập và dễ kiểm thử.

### 4. Concurrency Safety & Pessimistic Locking

Để chống race condition khi 2 khách hàng cùng đặt 1 thợ ảnh tại một khung giờ:

- Command tạo booking sử dụng **Pessimistic Write Lock (`pessimistic_write`)** trên bản ghi thợ ảnh trong transaction trước khi kiểm tra lịch trống và tạo booking.

---

## 📦 Phân ranh giới Domain & Nghiệp vụ (Domain & Bounded Contexts)

Toàn bộ hệ thống được chia thành 10 Bounded Contexts cốt lõi tại `src/modules/`:

| Domain Module         | Vị trí thư mục              | Trách nhiệm chính & Nghiệp vụ cốt lõi                                                                                                                                                        |
| :-------------------- | :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity**          | `src/modules/identity/`     | Quản lý người dùng (`users`, `customers`, `admins`), đồng bộ danh tính Keycloak, phân quyền RBAC, cập nhật hồ sơ, khóa/mở tài khoản (`active`, `suspended`, `banned`).                       |
| **Photographer**      | `src/modules/photographer/` | Hồ sơ thợ ảnh (`photographers`), phê duyệt/xác minh danh tính thợ ảnh, phong cách chụp (`styles`), tính điểm đánh giá trung bình (`ratings`), tìm kiếm và bảng xếp hạng thợ ảnh.             |
| **Portfolio**         | `src/modules/photographer/` | Quản lý album ảnh mẫu (`portfolios`), sắp xếp thứ tự ảnh hiển thị, link xem trước và tối ưu hiển thị tác phẩm của thợ.                                                                       |
| **Calendar**          | `src/modules/calendar/`     | Quản lý thời gian biểu làm việc (`working_slots`), chặn lịch bận cá nhân (`offline_slots`), API kiểm tra thời gian rảnh / khả dụng phục vụ đặt lịch.                                         |
| **Booking**           | `src/modules/booking/`      | Vòng đời đơn đặt lịch chụp (`bookings`): tạo mới, thợ chấp nhận/từ chối, hủy đơn, hoàn tất buổi chụp, bàn giao sản phẩm, tự động tính cọc 30% làm tròn theo VND.                             |
| **Payment & Wallet**  | `src/modules/payment/`      | Ví nội bộ (`wallets`), thanh toán đặt cọc (`deposit`), thanh toán phần còn lại (`remaining`), tích hợp cổng thanh toán PayOS VietQR, xử lý webhook và yêu cầu hoàn tiền (`refund_requests`). |
| **Subscription**      | `src/modules/subscription/` | Các gói hội viên cho nhiếp ảnh gia (`photographer_plans`), quản lý tính năng và hạn ngạch (`plan_features`), xử lý thanh toán gia hạn định kỳ qua PayOS webhook.                             |
| **Media**             | `src/modules/media/`        | Quản lý tệp đa phương tiện (`media`), sinh S3/MinIO Presigned URL an toàn để upload/download tệp, đóng gói bộ ảnh giao hàng cho khách (`booking_deliveries`).                                |
| **Feedback / Review** | `src/modules/feedback/`     | Đánh giá buổi chụp (`feedbacks`), chấm điểm sao (1-5 sao) và để lại nhận xét sau khi đơn chụp hoàn thành.                                                                                    |
| **Moderation**        | `src/modules/moderation/`   | Quản lý báo cáo vi phạm (`reports`), khiếu nại giữa khách hàng và thợ ảnh, công cụ cho Admin xử lý tranh chấp và áp dụng chế tài.                                                            |

---

## 📂 Cấu trúc mã nguồn (Project Structure)

```text
lens-backend/
├── apps/
│   ├── core/                  # Ứng dụng chính: Bootstrap NestJS, cấu hình server HTTP
│   └── cli/                   # Công cụ dòng lệnh hỗ trợ quản trị và tác vụ nội bộ
├── src/
│   ├── features/              # Tầng giao diện và kết nối ngoại vi (Delivery / Features)
│   │   ├── api/
│   │   │   ├── http/          # 13 HTTP Controllers đón nhận request từ Client
│   │   │   ├── dto/           # Data Transfer Objects phân tách rõ theo từng Domain
│   │   │   ├── swagger/       # OpenAPI Record Schemas & Response Registry theo Operation ID
│   │   │   ├── auth/          # Keycloak Guards, Decorators và Google Auth Service
│   │   │   ├── modules/       # NestJS Modules ghép nối Controller với CQRS Handler
│   │   │   └── setup.ts       # Cấu hình Swagger, CORS và ValidationPipe toàn cục
│   │   ├── socketio/          # WebSocket Gateway phục vụ thông báo Realtime
│   │   └── workers/           # Transactional Outbox Worker chạy ngầm
│   ├── modules/               # Tầng nghiệp vụ cốt lõi (Domain & Application Contexts)
│   │   ├── booking/           # *.command.ts, *.query.ts, *.use-case.ts, *.domain.ts, ports/
│   │   ├── calendar/
│   │   ├── feedback/
│   │   ├── identity/
│   │   ├── media/
│   │   ├── moderation/
│   │   ├── payment/
│   │   ├── photographer/
│   │   └── subscription/
│   └── shared/                # Hạ tầng dùng chung (Cross-cutting Concerns)
│       ├── contracts/         # Input contract độc lập HTTP
│       ├── database/          # TypeORM Entities (mỗi bảng 1 file), DatabaseModule, Helpers
│       ├── integrations/      # Các Adapter kết nối: Keycloak, PayOS, S3/MinIO, Realtime
│       └── platform/          # Context xác thực Actor, cấu hình môi trường, xử lý lỗi chung
├── .docker/                   # Dockerfile và Docker Compose (Postgres, Redis, MinIO, Keycloak)
├── docs/                      # Tài liệu kỹ thuật chuyên sâu và hướng dẫn chi tiết
├── migrations/                # Các tập lệnh SQL khởi tạo và chuyển đổi schema
├── scripts/                   # Scripts quản trị: seed dữ liệu, cấu hình Keycloak, migration runner
└── test/                      # Kiểm thử hợp đồng OpenAPI, kiểm thử tích hợp, kiểm thử ranh giới domain
```

---

## 🚀 Bắt đầu nhanh (Quick Start & Local Setup)

### 1. Yêu cầu môi trường

- **Node.js**: Phiên bản 20 trở lên (khuyên dùng LTS).
- **pnpm**: Trình quản lý gói chính thức của dự án (`npm install -g pnpm`).
- **Docker & Docker Compose**: Dùng để khởi chạy các dịch vụ phụ trợ cục bộ.

### 2. Cài đặt Dependencies

```bash
pnpm install
```

### 3. Cấu hình biến môi trường

Tạo file `.env` tại thư mục gốc từ mẫu tham khảo:

```bash
cp lens.env.example .env
```

Cập nhật các thông số kết nối Database, Redis, S3/MinIO, PayOS và Keycloak phù hợp với môi trường của bạn.

> 💡 _Dự án hỗ trợ giải mã tự động qua SOPS nếu bạn có khóa Age Key: xem chi tiết tại [docs/SECRETS_GUIDE.md](docs/SECRETS_GUIDE.md)._

### 4. Khởi chạy các dịch vụ hỗ trợ (Docker)

Khởi động cụm dịch vụ cơ bản (PostgreSQL, Redis, MinIO):

```bash
pnpm docker:up
```

_(Tùy chọn: Nếu muốn chạy cả Keycloak và Kong cục bộ, sử dụng: `docker compose -f .docker/compose.yaml --profile full up -d`)._

### 5. Áp dụng Database Migration & Seed dữ liệu

```bash
# Áp dụng cấu trúc bảng mới nhất vào PostgreSQL
pnpm db:migrate

# Nạp dữ liệu mẫu ban đầu (nếu cần)
pnpm db:seed
```

### 6. Khởi chạy ứng dụng Backend

```bash
# Chế độ phát triển (hot-reload)
pnpm start:dev

# Chế độ kiểm tra debug
pnpm start:debug

# Build và chạy production
pnpm build
pnpm start:prod
```

### 7. Truy cập Swagger UI

Khi ứng dụng khởi động thành công tại cổng mặc định `3000`:

- 🌐 **Swagger Interactive UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- 📄 **OpenAPI JSON Document**: [http://localhost:3000/docs-json](http://localhost:3000/docs-json)

---

## 🎛️ Bật/tắt tính năng (Feature Flags)

Hệ thống cho phép bật/tắt linh hoạt 10 Feature Modules qua biến môi trường mà không cần sửa code. Đặt biến tương ứng thành `false` trong `.env` rồi khởi động lại server:

```dotenv
FEATURE_IDENTITY_ENABLED=true
FEATURE_PHOTOGRAPHER_ENABLED=true
FEATURE_PORTFOLIO_ENABLED=true
FEATURE_BOOKING_ENABLED=true
FEATURE_PAYMENT_ENABLED=true
FEATURE_CALENDAR_ENABLED=true
FEATURE_MEDIA_ENABLED=true
FEATURE_REVIEW_ENABLED=true
FEATURE_SUBSCRIPTION_ENABLED=true
FEATURE_MODERATION_ENABLED=true
```

> **Lưu ý**: Swagger UI sẽ tự động loại bỏ các endpoint thuộc về module bị tắt, đảm bảo tài liệu API luôn trung thực với runtime thực tế.

---

## 🧪 Kiểm thử & Đảm bảo chất lượng (Testing & Quality Assurance)

```bash
# 1. Kiểm tra kiểu dữ liệu tĩnh (Type Checking)
pnpm typecheck

# 2. Kiểm thử hợp đồng OpenAPI (Đảm bảo 100% route có schema Swagger hợp lệ)
pnpm test:openapi

# 3. Kiểm thử đơn vị & ranh giới Domain
pnpm test

# 4. Kiểm thử tích hợp (Yêu cầu DB 'lens_test' riêng biệt)
LENS_TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/lens_test pnpm test:integration

# 5. Kiểm tra và tự động sửa lỗi định dạng code / linter
pnpm lint
pnpm format
```

---

## 📚 Tài liệu tham khảo (Documentation Index)

Toàn bộ tài liệu kiến trúc và hướng dẫn vận hành chi tiết được lưu trữ tại thư mục [`docs/`](docs/):

| Tài liệu                                                                 | Mô tả chi tiết                                                                                      |
| :----------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| 🏛️ **[Hướng dẫn Kiến trúc](docs/ARCHITECTURE_GUIDE.md)**                 | Chi tiết phân tầng Clean Architecture, nguyên tắc CQRS, ranh giới Domain, cách dùng Port & Adapter. |
| ⚙️ **[Hướng dẫn Triển khai & Vận hành](docs/backend-implementation.md)** | Hướng dẫn cấu hình runtime, chi tiết luồng nghiệp vụ Booking/Payment, cơ chế Outbox và kiểm thử.    |
| 🗄️ **[Quyết định Cơ sở dữ liệu](docs/database-decisions.md)**            | Thiết kế 20 thực thể bảng, chiến lược phân rã schema SQL và quy trình quản lý migration an toàn.    |
| 🔑 **[Đăng nhập Google qua Keycloak](docs/keycloak-google-login.md)**    | Hướng dẫn cấu hình Identity Provider Google Brokering và luồng đăng nhập trao đổi token.            |
| 🔐 **[Bảo mật Secrets & Biến môi trường](docs/SECRETS_GUIDE.md)**        | Quy trình mã hóa biến môi trường tự động không chạm (Zero-touch) với Mozilla SOPS và Age.           |
| 📋 **[API Tracker](docs/api-tracker.json)**                              | Danh sách theo dõi toàn bộ 80 Operation ID HTTP đã triển khai trong hệ thống.                       |

---

## 🚀 Triển khai (Deployment)

<!-- PHẦN NÀY ĐANG ĐỂ TRỐNG ĐỂ BỔ SUNG SAU -->

> _Phần này sẽ được cập nhật quy trình triển khai chi tiết bao gồm: Cấu hình CI/CD Pipelines, Đóng gói Container Production, Cấu hình Gateway/Reverse Proxy (Kong/Nginx), Quản trị hạ tầng Cloud (AWS/DigitalOcean/Kubernetes) và Giám sát vận hành (Prometheus, Grafana, Logging)._

---

## 📄 Bản quyền (License)

Dự án được phát triển phục vụ mục đích học tập và nghiên cứu trong khuôn khổ môn học EXE202 tại **Đại học FPT**. Mọi quyền được bảo lưu.
