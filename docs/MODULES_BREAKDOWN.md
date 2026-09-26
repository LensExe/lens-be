# Hướng dẫn cấu trúc module và flow

Tài liệu này mô tả convention đang được dùng trong Lens Backend. Mục tiêu là giúp tìm đúng nơi để thêm endpoint, nghiệp vụ, database entity hoặc integration mới mà không làm business logic bị dồn vào controller.

Kiến trúc hiện tại là Clean Architecture tinh gọn theo bounded context, dùng NestJS và CQRS:

```text
HTTP request
  -> Global KeycloakGuard
  -> Controller + HTTP DTO
  -> CommandBus / QueryBus
  -> CommandHandler / QueryHandler
  -> Use case
  -> Domain rule + EntityManager
  -> Database / outbox / integration
  -> HTTP response
```

## 1. Bản đồ thư mục

```text
src/
  features/                         # Adapter và wiring theo giao thức
    api/
      http/                         # Controller HTTP
      auth/                         # Auth service/guard dành cho API
      dto/                          # DTO request, validation, Swagger
      modules/                      # NestJS module ghép controller + handler
      swagger/                      # Response schema OpenAPI
      api-runtime.module.ts         # Composition root của API
      feature-modules.ts            # Registry bật/tắt API feature
    socketio/                       # Gateway realtime
    workers/                        # Background worker, ví dụ outbox

  modules/                          # Business module theo bounded context
    <context>/
      *.domain.ts                    # Quy tắc thuần, chỉ tạo khi cần
      *.use-case.ts                  # Điều phối nghiệp vụ + I/O
      *.command.ts                   # Command và CommandHandler
      *.query.ts                     # Query và QueryHandler
      ports/                         # Port mà context này cần từ context khác

  shared/
    contracts/                      # Input contract độc lập với HTTP
    database/entities/              # TypeORM entity và EntitySchemas
    domain/                         # Value/rule dùng chung thật sự
    integrations/                   # Keycloak, S3, Payment, Realtime...
    platform/                       # Auth actor, config, exception, cookie...
    common/                         # Helper dùng chung ở application layer
```

### Nguyên tắc phân lớp

| Lớp                  | Nơi đặt                                            | Trách nhiệm                                                       | Không nên làm                               |
| -------------------- | -------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| HTTP adapter         | `src/features/api/http`                            | Nhận request, lấy `actor`, tạo command/query, trả kết quả         | Query database hoặc chứa business rule      |
| HTTP DTO             | `src/features/api/dto`                             | Validate input HTTP và mô tả Swagger                              | Dùng làm contract cho domain                |
| CQRS adapter         | `src/modules/<context>/*.command.ts`, `*.query.ts` | Chuyển message từ bus vào use case, mở transaction                | Viết rule nghiệp vụ                         |
| Use case             | `src/modules/<context>/*.use-case.ts`              | Đọc/ghi dữ liệu, kiểm tra quyền, gọi domain, điều phối nhiều bước | Phụ thuộc controller                        |
| Domain               | `src/modules/<context>/*.domain.ts`                | Quy tắc thuần, state transition, invariant                        | Gọi DB/API/NestJS/TypeORM                   |
| Persistence          | `src/shared/database/entities`                     | Mapping bảng và cột TypeORM                                       | Chứa business rule thay cho domain/use case |
| External integration | `src/shared/integrations`                          | Adapter tới Keycloak, S3, PayOS, Redis...                         | Bị gọi trực tiếp từ controller              |

Quy tắc phụ thuộc chính:

```text
features -> modules/use-case + modules/ports -> modules/domain + shared/domain
                                               -> EntityManager / integrations
```

Domain không import từ `features`, NestJS, TypeORM hoặc integration. Use case được phép dùng `EntityManager` và các integration chung. Controller chỉ là adapter đầu vào.

## 2. Bản đồ các business module hiện có

`ApiModule` nạp các API feature module trong `feature-modules.ts`. Mỗi API feature module thường ghép controller và các CQRS handler; business use case được đăng ký tập trung trong `api-runtime.module.ts`.

| Bounded context | Business files                       | API module              | Controller                                                                        | Phạm vi nghiệp vụ                                                           |
| --------------- | ------------------------------------ | ----------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Identity        | `src/modules/identity`               | `IdentityApiModule`     | `AuthController`, `GoogleAuthController`, `UserController`, `AdminUserController` | Auth flow, user profile, customer profile, wallet, quản trị trạng thái user |
| Photographer    | `src/modules/photographer`           | `PhotographerApiModule` | `PhotographerController`, `BookingPlanController`                                 | Hồ sơ, tìm kiếm, trạng thái photographer và gói chụp (booking plan)         |
| Portfolio       | Vẫn thuộc `src/modules/photographer` | `PortfolioApiModule`    | `PortfolioController`                                                             | Portfolio và portfolio item của photographer                                |
| Booking         | `src/modules/booking`                | `BookingApiModule`      | `BookingController`                                                               | Tạo, nhận, hủy, hoàn tất, dispute và timeline booking                       |
| Calendar        | `src/modules/calendar`               | `CalendarApiModule`     | `CalendarController`                                                              | Offline slot và availability                                                |
| Media           | `src/modules/media`                  | `MediaApiModule`        | `MediaController`                                                                 | Upload, gallery, publish, download và ownership media                       |
| Feedback/Review | `src/modules/feedback`               | `ReviewApiModule`       | `ReviewController` trong `feedback.controller.ts`                                 | Review, rating summary và feedback                                          |
| Payment         | `src/modules/payment`                | `PaymentApiModule`      | `PaymentController` trong `payments.controller.ts`                                | Deposit, QR, transaction, refund, payment webhook                           |
| Subscription    | `src/modules/subscription`           | `SubscriptionApiModule` | `SubscriptionController`                                                          | Plan, subscription, usage và subscription webhook                           |
| Moderation      | `src/modules/moderation`             | `ModerationApiModule`   | `ModerationController`                                                            | Report, moderation dashboard và resolve report                              |

Lưu ý: tên API module không phải lúc nào cũng trùng tên thư mục business. Ví dụ `PortfolioApiModule` dùng các command/query trong `src/modules/photographer` vì portfolio đang được ownership bởi context photographer.

Gói chụp (`booking_plans`) là danh mục dịch vụ thợ tự quản lý nên thuộc context photographer; booking chỉ đọc gói và lưu snapshot giá (`total_amount`) lúc đặt.

## 3. Flow xử lý request

### 3.1. Global authentication và authorization

`KeycloakGuard` được đăng ký global tại `src/features/api/api-runtime.module.ts`.

- `@Public()`: bỏ qua việc yêu cầu Bearer token. Dùng cho register, login, refresh, logout, OTP public và Google callback.
- `@Access([])`: bắt buộc có access token nhưng không yêu cầu role cụ thể.
- `@Access(['admin'])`: bắt buộc token có role `admin`.
- Guard verify JWT bằng JWKS của Keycloak, tạo `Actor` và gắn vào `req.actor`.
- Với route không phải public/registration, guard gọi `currentUser(...)` để bảo đảm actor đã có profile local và tài khoản đang `active`.

`Actor.sub` là ID user trên Keycloak. `users.id` là UUID của Lens. Khi cần tìm user local, dùng mapping `users.keycloak_id = actor.sub`, không coi hai ID này là một.

`@Registration()` đã có trong guard metadata cho những route cần token nhưng chưa có local profile. Hiện các route register đang dùng `@Public()` và flow register tự tạo profile sau khi xác thực với Keycloak.

### 3.2. Command flow: ghi dữ liệu

Ví dụ `PATCH /users/me`:

```text
UserController.updateMe()
  -> new IdentityUpdateMeCommand(actor, input)
  -> CommandBus.execute(...)
  -> IdentityUpdateMeCommandHandler.execute()
  -> DataSource.transaction(manager => IdentityUseCases.updateMe(manager, ...))
  -> currentUser(manager, actor)
  -> updateEntity(manager, EntitySchemas.users, ...)
```

Command handler phải mỏng. Transaction được mở ở handler, còn use case nhận `EntityManager` đã nằm trong transaction. Không inject `DataSource` rồi tự tạo transaction trong use case.

### 3.3. Query flow: đọc dữ liệu

Ví dụ `GET /users/me`:

```text
UserController.me()
  -> new IdentityMeQuery(actor, {})
  -> QueryBus.execute(...)
  -> IdentityMeQueryHandler.execute()
  -> DataSource.transaction(manager => IdentityUseCases.me(manager, actor))
  -> currentUser(manager, actor)
  -> return local user
```

Query hiện cũng dùng `DataSource.transaction(...)` theo convention của project để use case có cùng cách nhận `EntityManager`. Không đặt query TypeORM trực tiếp trong controller.

## 4. Identity module chi tiết

### 4.1. Trách nhiệm từng file

| File                                                                   | Trách nhiệm                                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`identity.domain.ts`](../src/modules/identity/identity.domain.ts)     | Rule thuần về đăng ký lại và chuyển trạng thái admin: không tự ban chính mình, không re-activate user đã bị ban |
| [`identity.use-case.ts`](../src/modules/identity/identity.use-case.ts) | Tạo local profile, đọc/cập nhật user, admin list/detail, suspend/unsuspend/ban                                  |
| [`identity.command.ts`](../src/modules/identity/identity.command.ts)   | Register, update profile, status, suspend, unsuspend, ban và các handler ghi dữ liệu                            |
| [`identity.query.ts`](../src/modules/identity/identity.query.ts)       | Me, public user, admin user detail/list và các query handler                                                    |
| [`identity.contract.ts`](../src/shared/contracts/identity.contract.ts) | Input contract mà command/query nhận, không phụ thuộc HTTP                                                      |
| [`identity.dto.ts`](../src/features/api/dto/identity.dto.ts)           | Validation/Swagger cho input từ HTTP                                                                            |
| `auth.controller.ts`                                                   | Password auth, refresh/logout, password reset và email OTP                                                      |
| `google-auth.controller.ts`                                            | Google login/callback qua Keycloak OIDC                                                                         |
| `user.controller.ts`                                                   | `users/me` và public user detail                                                                                |
| `admin-user.controller.ts`                                             | Admin list/detail/status/suspend/unsuspend/ban                                                                  |
| `auth.service.ts`                                                      | Điều phối token/password/OTP giữa API và Keycloak/notification service                                          |
| `google-auth.service.ts`                                               | Tạo URL OIDC, consume PKCE state, exchange code và tạo `Actor`                                                  |

### 4.2. Password register

```text
POST /auth/register
  -> AuthController.register()
  -> AuthService.registerWithPassword()
     -> KeycloakTokenService.registerUserWithPassword()
     -> KeycloakTokenService.exchangePasswordForToken()
     -> KeycloakService.verifyToken()
     -> tạo Actor từ claims
  -> IdentityCustomerRegisterCommand
  -> IdentityUseCases.register()
     -> tìm users theo keycloak_id
     -> nếu đã có và active: trả user hiện tại
     -> nếu chưa có: tạo User + Customer + Wallet trong một transaction
  -> trả token set + user local
```

Auth provider và local profile là hai trách nhiệm khác nhau:

- Keycloak lưu credential, token và identity provider account.
- Lens lưu `UserEntity`, `CustomerEntity`, `WalletEntity` và dữ liệu nghiệp vụ.
- `IdentityCustomerRegisterCommand` được dùng lại bởi Google callback, nên logic khởi tạo local profile không được viết lại trong controller.

### 4.3. Password login

```text
POST /auth/login
  -> AuthService.loginWithPassword()
  -> Keycloak exchange password lấy token
  -> verify access token và tạo Actor
  -> IdentityMeQuery(actor)
  -> IdentityUseCases.me()
  -> trả token set + user local
```

`AuthService` xử lý xác thực với Keycloak; `IdentityUseCases.me()` chỉ đọc profile Lens.

### 4.4. Google login qua Keycloak

```text
GET /keycloak/google/login
  -> GoogleAuthService.buildLoginUrl()
  -> KeycloakOidcRedirectService tạo state + PKCE
  -> redirect tới Google thông qua Keycloak Identity Broker

GET /keycloak/google/callback?code=...&state=...
  -> consume state/PKCE một lần
  -> exchange authorization code lấy Keycloak token
  -> verify token và tạo Actor
  -> IdentityCustomerRegisterCommand(actor, fullname)
  -> tạo hoặc lấy local User/Customer/Wallet
  -> trả token set + user local
```

Không tự gọi Google API trong `IdentityUseCases`; Google OIDC thuộc `GoogleAuthService` và Keycloak integration.

### 4.5. Profile hiện tại và admin user

```text
GET /users/me
PATCH /users/me
  -> KeycloakGuard verify token + currentUser check
  -> UserController
  -> IdentityMeQuery hoặc IdentityUpdateMeCommand
  -> IdentityUseCases
```

```text
GET  /admin/users
GET  /admin/users/:id
PATCH /admin/users/:id/status
POST /admin/users/:id/suspend
POST /admin/users/:id/unsuspend
POST /admin/users/:id/ban
  -> @Access(['admin'])
  -> AdminUserController
  -> IdentityAdmin*Query hoặc Identity*Command
  -> role(actor, 'admin') trong use case
  -> Identity.adminUpdateStatus() khi cần kiểm tra state transition
```

Không chỉ dựa vào `@Access(['admin'])`: use case admin vẫn gọi `role(...)` để business layer tự bảo vệ khi được gọi từ entry point khác.

## 5. Thêm endpoint vào context đã có

Giả sử thêm chức năng `GET /photographers/me/statistics` vào context photographer.

### Bước 1: Xác định ownership

Quyết định endpoint thuộc context nào trước khi tạo file. Nếu dữ liệu và rule thuộc photographer thì đặt use case tại `src/modules/photographer`, kể cả endpoint có thể liên quan portfolio hoặc booking.

### Bước 2: Thêm HTTP DTO nếu có input

Đặt DTO tại `src/features/api/dto/<context>.dto.ts` hoặc file DTO đang chứa nhóm API tương ứng.

- DTO chỉ có `class-validator`, `class-transformer` và Swagger decorator.
- Không import DTO vào `src/modules`.
- Nếu endpoint không có input, dùng `Record<string, never>` ở contract thay vì tạo DTO rỗng không cần thiết.

### Bước 3: Thêm input contract

Đặt interface/type tại `src/shared/contracts/<context>.contract.ts`:

```ts
export interface PhotographerStatisticsQueryInput {
  from?: string;
  to?: string;
}
```

Controller chuyển DTO sang contract khi tạo query/command.

### Bước 4: Thêm Query hoặc Command

- Đọc dữ liệu: thêm `PhotographerStatisticsQuery` trong `photographers.query.ts`.
- Tạo/cập nhật/xóa dữ liệu: thêm command trong `photographers.command.ts`.
- Message chỉ giữ `actor` và `input`.
- Handler chỉ nhận `DataSource`, `UseCases`, mở transaction và gọi method tương ứng.

Mẫu query:

```ts
export class PhotographerStatisticsQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerStatisticsQueryInput,
  ) {}
}

@QueryHandler(PhotographerStatisticsQuery)
export class PhotographerStatisticsQueryHandler implements IQueryHandler<PhotographerStatisticsQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
  ) {}

  execute(message: PhotographerStatisticsQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.statistics(s, message.actor, message.input),
    );
  }
}
```

### Bước 5: Thêm use case và domain rule

- Thêm method vào `photographer.use-case.ts`.
- Dùng `currentUser`, `photographer`, `required` hoặc helper access phù hợp.
- Dùng `EntityManager` được truyền vào để query database.
- Nếu có state transition/invariant thuần, thêm method vào `photographer.domain.ts`.
- Không đưa query database vào domain.

### Bước 6: Gắn vào controller

Controller cần:

1. Thêm decorator auth (`@Access([])` hoặc role phù hợp).
2. Thêm decorator Swagger và `operationId` đúng convention.
3. Lấy `req.actor`.
4. Tạo query/command.
5. Gọi `this.queries.execute(...)` hoặc `this.commands.execute(...)`.

### Bước 7: Đăng ký handler

Thêm handler vào `providers` của API module tương ứng, ví dụ `photographer-api.module.ts`. Nếu quên bước này, CQRS sẽ không tìm thấy handler lúc runtime.

Use case mới phải được thêm vào `applicationServices` trong `api-runtime.module.ts` nếu đó là class use case mới. Với context hiện có, thường chỉ cần dùng use case đã được đăng ký.

### Bước 8: Hoàn thiện response và test

- Nếu response dùng schema thủ công, thêm record/schema phù hợp trong `src/features/api/swagger`.
- Nếu endpoint có API tracker, cập nhật `docs/api-tracker.json` theo convention của project.
- Viết hoặc cập nhật test.
- Chạy `npm run typecheck`, test liên quan và `npm run build`.

## 6. Tạo business module mới

Chỉ tạo context mới khi nghiệp vụ có ownership và lifecycle riêng; không tạo module mới chỉ vì thêm một endpoint.

### Cấu trúc tối thiểu

```text
src/modules/<context>/
  <context>.use-case.ts
  <context>s.command.ts       # nếu có ghi dữ liệu
  <context>s.query.ts          # nếu có đọc dữ liệu
  <context>.domain.ts          # nếu có rule thuần
  ports/                       # nếu context cần port từ context khác

src/features/api/
  http/<context>.controller.ts
  dto/<context>.dto.ts
  modules/<context>-api.module.ts
```

Sau đó:

1. Đăng ký use case trong `applicationServices` và `exports` của `api-runtime.module.ts`.
2. Đăng ký controller/handler trong `<context>-api.module.ts`.
3. Thêm API module vào `apiFeatureModuleRegistry` trong `feature-modules.ts`.
4. Nếu có entity mới, thêm entity vào `databaseEntities`, `EntitySchemas` và barrel export trong `src/shared/database/entities`.
5. Tạo migration tương ứng; không dựa vào synchronize để thay đổi schema ở môi trường dùng chung.

### Port giữa các context

Port nằm ở phía context tiêu thụ:

```text
src/modules/<consumer>/ports/<capability>.port.ts
```

Ví dụ hiện có:

| Context tiêu thụ       | Port                       | Context cung cấp |
| ---------------------- | -------------------------- | ---------------- |
| Booking                | `RatingUpdaterPort`        | Feedback/Review  |
| Calendar               | `PendingBookingsPort`      | Booking          |
| Calendar               | `CollaborationTimesPort`   | Booking          |
| Photographer/Portfolio | `MediaOwnershipPort`       | Media            |
| Subscription           | `SubscriptionPaymentsPort` | Payment          |

Use case inject port, không inject trực tiếp use case của context khác. Mapping runtime dùng `useExisting` trong `api-runtime.module.ts`.

Integration có phạm vi toàn ứng dụng, như `PaymentGateway` hoặc `RealtimePublisher`, đặt tại `src/shared/integrations`, không đặt trong một business context cụ thể.

## 7. Những nơi không nên đặt code

- Không query database trong `*.controller.ts`.
- Không đặt business rule vào `*.api.module.ts` hoặc CQRS handler.
- Không import `IdentityUpdateMeCommandBodyDto` vào use case; use case nhận contract.
- Không gọi Keycloak, S3 hoặc PayOS trực tiếp trong domain.
- Không tạo `src/modules/portfolio` chỉ để thêm portfolio endpoint khi ownership hiện tại vẫn là photographer.
- Không import trực tiếp use case của context khác; tạo/inject port ở phía consumer.
- Không dùng `jwt.decode()` để xác thực; việc verify token thuộc `KeycloakService`/guard.
- Không sửa entity mà quên migration, `EntitySchemas` hoặc Swagger record schema khi response có thay đổi.

## 8. Checklist nhanh trước khi mở PR

- [ ] Endpoint đã được đặt trong đúng bounded context.
- [ ] Controller chỉ làm HTTP mapping và gọi CommandBus/QueryBus.
- [ ] DTO nằm trong `src/features/api/dto`.
- [ ] Input contract nằm trong `src/shared/contracts`.
- [ ] Ghi dữ liệu dùng command và transaction.
- [ ] Đọc dữ liệu dùng query.
- [ ] Rule thuần được đặt trong domain, I/O đặt trong use case.
- [ ] Handler đã được đăng ký trong API module.
- [ ] Use case mới đã được đăng ký trong `api-runtime.module.ts`.
- [ ] Auth decorator và kiểm tra quyền phù hợp.
- [ ] Swagger `operationId`/response schema đã được cập nhật.
- [ ] Entity registry và migration đã được cập nhật nếu có bảng/cột mới.
- [ ] Đã chạy `npm run typecheck`, test liên quan và build.

## 9. Các lệnh kiểm tra thường dùng

```bash
npm run typecheck
npm run test
npm run build
npm run test:openapi
npm run test:integration
```

Tài liệu tổng quan liên quan: [`ARCHITECTURE_GUIDE.md`](./ARCHITECTURE_GUIDE.md), [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) và [`SECRETS_GUIDE.md`](./SECRETS_GUIDE.md).
