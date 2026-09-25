# Identity — việc cần làm (bàn giao)

Cập nhật 25/09/2026, dựa trên `dev` @ `56b9bea`. Làm trên nhánh `identity`, xong mở PR vào `dev`.

Đọc trước:

- `CLAUDE.md` (nếu có ở máy bạn) hoặc `docs/ARCHITECTURE_GUIDE.md`, `docs/MODULES_BREAKDOWN.md`: kiến trúc controller → command/query → use case → domain.
- Quy trình vá lỗi: viết test **đỏ** trước, vá xong **xanh**. Chạy `pnpm typecheck`, `pnpm test:unit`, `pnpm test:openapi` trước khi mở PR.

Đã xong ở PR #6 (không cần làm lại): response schema cho `/auth/*`, `operationId` mới `AUTH-009` → `AUTH-017`, cache chung `LensCacheModule`.

---

## Đã chốt với product owner

| #   | Chủ đề                | Quyết định                                                                                                                    |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| C1  | Role `customer`       | Dùng **default role của Keycloak**: mọi user mới (tự đăng ký, Google, admin tạo) tự có `customer`. Không gán bằng code BE     |
| C2  | Trở thành thợ         | Customer gửi hồ sơ thợ → admin duyệt → BE gán role `photographer` trên Keycloak. Phần hồ sơ/duyệt do nhánh `photographer` làm |
| C3  | Lưu OTP, reset token  | Chuyển sang **Redis** (`RedisService`), xem lý do ở việc 4                                                                    |
| C4  | Tách `AuthService`    | Tách theo CQRS, làm **cuối cùng** sau khi các việc khác đã có test                                                            |
| C5  | Quên mật khẩu trả 404 | **Để sau**, chưa sửa                                                                                                          |

---

## Việc cần làm (làm theo thứ tự)

### 1. Đăng nhập bằng mật khẩu luôn lỗi

- **Vị trí:** `src/shared/integrations/keycloak/token.service.ts:53`
- **Hiện tượng:** form `grant_type=password` gửi `email: params.email`. Keycloak đòi field `username`. Đã thử với Keycloak 24: trả `"Missing parameter: username"`. Nhánh `master` gửi `username` nên chạy được.
- **Sửa:** `username: params.email`. Realm phải bật "Login with email" (mặc định bật).
- **Nguồn:** [Keycloak – Resource Owner Password Credentials](https://www.keycloak.org/securing-apps/oidc-layers).

### 2. Giới hạn gửi OTP hết hạn sau 3,6 giây

- **Vị trí:** `src/features/api/auth/auth.service.ts:178`
- **Hiện tượng:** bộ đếm "tối đa 5 lần/giờ" set TTL `60 * 60` = 3600, nhưng cache-manager tính **ms** → hết hạn sau 3,6 giây, gần như không giới hạn.
- **Sửa:** nếu làm việc 4 (Redis) thì dùng TTL giây của Redis, lỗi này tự hết. Nếu chưa thì `* 60 * 1000`.

### 3. Xác thực email không gắn với chủ tài khoản

- **Vị trí:** `src/features/api/auth/auth.service.ts:296`
- **Hiện tượng:** OTP kiểm theo `body.email`, nhưng đánh dấu verified cho `actor.sub`. User A lấy OTP gửi tới một email B mình sở hữu, rồi xác thực cho tài khoản đang mang email C.
- **Sửa:** chỉ dùng `actor.email` (bỏ `email` khỏi body), hoặc `ensure(body.email === actor.email)`.

### 4. Chuyển OTP, reset token, bộ đếm sang Redis (C3)

- **Vì sao chọn Redis:**
  - Đây là state tạm phải nhất quán giữa các instance: gửi OTP ở instance A, kiểm ở instance B vẫn phải thấy. Cache in-memory là riêng từng process, restart là mất ([Azure – Caching guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching)).
  - Repo đã làm y hệt cho state Google login (PKCE) bằng `RedisService`.
  - Ý định ban đầu của tác giả cũng là Redis: comment `// Lấy email từ Redis dựa trên reset_token` (`auth.service.ts:267`), và `@keyv/redis` đã có từ commit khởi tạo.
  - In-memory chỉ có lợi là đơn giản, không cần Redis. Lợi ích đó không còn vì repo đã chạy Redis sẵn.
- **Cách làm:**
  - Inject `RedisService` (`src/shared/database/redis`). TTL tính bằng **giây**.
  - Bộ đếm gửi OTP: thêm hàm `incr(key, ttlSeconds)` vào `RedisService` (Redis `INCR` + `EXPIRE` lần đầu), để đếm nguyên tử, không bị ghi đè khi 2 request cùng lúc.
  - `LensCacheModule` (in-memory) giữ nguyên cho việc khác.

### 5. Gửi OTP qua `NotificationPort`

- **Vị trí:** `src/features/api/auth/auth.service.ts:203` (đang `axios.post` thẳng).
- **Sửa:** inject `NotificationPort` (`src/shared/integrations/notification`, đã có) và gọi `sendOtpEmail({ to, otp, event, expiresInMinutes })`.
- **Lưu ý:** thiếu `NOTIFICATION_SERVICE_URL` thì port trả 503 "not configured" (trước đây code tự đoán `localhost:3001`). Cần đặt biến này khi chạy local.

### 6. Tạo realm role + default role `customer` (C1)

- **Hiện tượng:** không chỗ nào tạo role `customer`/`photographer`/`admin`/`system`, và user mới không có role nào. Nhưng tạo booking đòi role `customer` (`src/modules/booking/booking.use-case.ts:27`) → user mới **không đặt lịch được**.
- **Sửa:** trong `scripts/configure-keycloak-google.mjs`:
  - Tạo 4 realm role: `customer`, `photographer`, `admin`, `system` (nếu chưa có).
  - Thêm `customer` vào composite `default-roles-<realm>`.
  - User đã tạo trước đó: gán bù `customer` (có thể thêm bước trong script).
- **Nguồn:** Keycloak tự gán default roles cho mọi user mới, kể cả tạo qua identity provider ([Server Admin Guide – Using default roles](https://www.keycloak.org/docs/latest/server_admin/)).

### 7. Cung cấp khả năng gán / gỡ role `photographer` (C2)

- Nhánh `photographer` sẽ khai báo **port** (phía module dùng) tại `src/modules/photographer/ports/photographer-role.port.ts`:

  ```ts
  export abstract class PhotographerRolePort {
    /** Gán realm role `photographer` cho user Keycloak. */
    abstract grant(keycloakUserId: string): Promise<void>;
    /** Gỡ realm role `photographer`. */
    abstract revoke(keycloakUserId: string): Promise<void>;
  }
  ```

  Trong lúc chờ, nhánh `photographer` wiring bằng bản no-op.

- **Việc của identity:**
  - Thêm vào `KeycloakUserService` hàm gán/gỡ realm role qua Admin API (`POST`/`DELETE /admin/realms/{realm}/users/{id}/role-mappings/realm`).
  - Viết class cung cấp (ví dụ trong `src/modules/identity/`) implement `PhotographerRolePort`, rồi đổi wiring trong `src/features/api/api-runtime.module.ts` từ no-op sang class này (`useExisting`).
- **Lưu ý:** role nằm trong token. Sau khi được gán, user phải refresh token / đăng nhập lại mới có role mới.

### 8. API sở thích của khách

- Bảng `customers` có `preferred_styles` (jsonb), `location` nhưng chưa có API.
- Thêm `GET` + `PATCH` cho chính khách đang đăng nhập (ví dụ `/customers/me`). Theo checklist thêm endpoint: contract → use case → command/query → DTO → controller → response schema → `docs/api-tracker.json` (id mới, không trùng).

### 9. Tách `AuthService` theo kiến trúc (C4, làm cuối)

- **Hiện tượng:** `src/features/api/auth/auth.service.ts` ở tầng features, controller gọi thẳng, service gọi thẳng Keycloak/cache/HTTP và import DTO. Trái `docs/MODULES_BREAKDOWN.md` ("integration không gọi trực tiếp từ controller").
- **Sửa:** controller → command/query → use case trong `src/modules/identity/` → Keycloak / Redis / `NotificationPort`. Input đặt ở `src/shared/contracts/identity.contract.ts`. Xoá `AuthService`.
- **Điều kiện:** API giữ nguyên (path, body, response, `operationId`). Test của việc 1–8 phải vẫn xanh.

### Để sau (C5): quên mật khẩu lộ email đã đăng ký

- `auth.service.ts:164` trả 404 khi email chưa có → người ngoài dò được email nào có tài khoản.
- Khuyến nghị khi làm: luôn trả 200 cùng một câu ([OWASP – Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)).

---

## Chạy thử ở máy local

- Hạ tầng: `pnpm docker:up` (Postgres, Redis). Keycloak nằm ở profile `full`: `docker compose -f .docker/compose.yaml --profile full up -d keycloak`.
- DB: `pnpm db:migrate` rồi `pnpm db:seed`.
- Keycloak local chưa có realm `lens`: chạy `pnpm keycloak:google:setup` (cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `KEYCLOAK_ADMIN_USERNAME/PASSWORD` trong `.env`), hoặc tạo tay realm + client + role.
- MinIO trong compose hiện không pull được (xem báo cáo lỗi của team); không ảnh hưởng việc làm identity.
