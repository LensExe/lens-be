# Cấu hình plugin và tính năng Kong cho Lens

**Mục đích:** ghi lại chính sách plugin và cấu hình gateway đang dùng. Template
nằm tại [`.docker/kong/kong.yml`](../../.docker/kong/kong.yml); Compose mount file
được render theo JWKS cho Kong DB-less. Core và Chat đã có route; Notification
chưa được thêm cho tới khi contract của service hoàn tất.

## 1. Plugin nào nên có ở v1?

| Plugin / tính năng       | Mức độ                                   | Dùng để làm gì                                                  | Giới hạn cần nhớ                                                                                                            |
| ------------------------ | ---------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `cors`                   | Cần cho Web chạy khác origin             | Trả CORS headers và xử lý preflight cho browser                 | Dùng origin cụ thể theo môi trường; không dùng `*` khi bật credentials. Mobile native thường không cần CORS.                |
| `rate-limiting`          | Nên có                                   | Hạn chế burst/abuse theo IP hoặc service ở edge                 | `local` đếm riêng trên từng Kong instance. Giới hạn theo tài khoản/email/số điện thoại vẫn phải làm trong service.          |
| `request-size-limiting`  | Nên có                                   | Chặn body quá lớn trước khi vào backend                         | Giới hạn mẫu dưới đây là 2 MB cho API JSON; điều chỉnh theo DTO thực tế. Upload file nên dùng object storage có URL ký sẵn. |
| `request-transformer`    | Nên có như lớp phòng thủ phụ             | Loại các header danh tính giả do client tự gửi                  | Backend vẫn phải bỏ qua các header đó và xác thực JWT. Plugin này không thay guard.                                         |
| `jwt`                    | Đã bật cho Core protected routes và Chat | Kiểm tra chữ ký RS256 theo `kid` và claim `exp` tại edge        | Issuer/audience/role và quyền trên resource vẫn do backend xác minh; public routes không gắn plugin.                        |
| Request ID tích hợp Kong | Đã có sẵn từ Kong 3.5+                   | Gửi `X-Kong-Request-Id` tới client, upstream và log             | Giữ tên header mặc định; không bật thêm `correlation-id` trên cùng header.                                                  |
| `prometheus`             | Khuyến nghị cho staging/production       | Xuất metric request, status, latency, bandwidth/upstream health | Chỉ cho Prometheus scrape qua mạng quản trị riêng; không tạo public route `/metrics`.                                       |

### Không bật trong baseline hiện tại

- **`openid-connect`:** không đưa vào cấu hình; đây là plugin Enterprise, khác với JWT plugin có sẵn trong Kong OSS. Chỉ chọn khi đã quyết định edition/license và mô hình đăng nhập.
- **`acl`, `key-auth`:** không dùng thay role/scope Keycloak hoặc object-level authorization của service.
- **`proxy-cache`, response transformer, bot detection:** chưa có yêu cầu cụ thể; không bật mặc định cho API người dùng/payment.
- **Logging plugin gửi request/response body:** không bật mặc định vì có thể đưa token, OTP, PII hoặc nội dung email vào hệ thống log. Dùng access/error log đã cấu hình redact.

### Cách cấu hình JWT với Keycloak

`scripts/render-kong-config.mjs` lấy các RSA signing key đang được Keycloak
công bố qua JWKS, chuyển thành PEM và khai báo credentials theo `kid` trong
Consumer `keycloak`. JWT plugin chỉ nhận token từ `Authorization: Bearer`, kiểm
tra chữ ký RS256 và `exp`; Kong OSS JWT không thay thế việc backend kiểm tra
issuer/audience và authorization. Public login/forgot-password/Google callback,
public GET, và payment/subscription webhook được route riêng không gắn JWT;
backend vẫn xác minh webhook và các guard theo thiết kế.

Keycloak key rotation cần chạy lại `pnpm docker:gateway` để render JWKS mới và
recreate Kong. Credential chỉ chứa public key, nhưng file render vẫn bị ignore
để tránh mang cấu hình theo môi trường vào Git.

## 2. Mẫu declarative config và baseline đang chạy

Plugin ở top-level `plugins` áp dụng toàn cục. Plugin nằm trong một service chỉ áp dụng cho service đó. Với plugin áp dụng đồng thời cho nhiều entity, cấu hình ở top-level và tham chiếu entity bằng tên. Đây là cú pháp Kong declarative config; `lens-backend` là DNS alias trong private Docker network ở local. Khối dưới đây giữ vai trò minh họa policy; template chạy thật là `.docker/kong/kong.yml`, được render thành `.docker/kong/kong.generated.yml` trước khi nạp.

```yaml
_format_version: '3.0'
_transform: true

# Plugin chung cho HTTP APIs đi qua Kong.
plugins:
  # Web dev hiện chạy trên Vite localhost:5173.
  # Thay/bổ sung origin thật theo từng environment trước khi deploy.
  - name: cors
    config:
      origins:
        - http://localhost:5173
        # - https://<web-origin-cua-environment>
      methods:
        - GET
        - HEAD
        - POST
        - PUT
        - PATCH
        - DELETE
        - OPTIONS
      headers:
        - Accept
        - Authorization
        - Content-Type
      exposed_headers:
        - X-Kong-Request-ID
      credentials: true
      max_age: 3600
      preflight_continue: false

  # Xóa identity header do client tự khai. Không xóa Authorization.
  - name: request-transformer
    config:
      remove:
        headers:
          - x-user-id
          - x-user-role
          - x-authenticated-user

  # Metrics phải được scrape bằng đường quản trị/private, không qua public API route.
  - name: prometheus
    config:
      per_consumer: false
      status_code_metrics: true
      latency_metrics: true
      bandwidth_metrics: true
      upstream_health_metrics: true

services:
  - name: core-api
    url: http://core-api:3000
    routes:
      - name: core-api-v1
        paths:
          - /api/v1/auth
          - /api/v1/users
          - /api/v1/bookings
          - /api/v1/payments
          # Bổ sung path owner còn lại từ OpenAPI Core.
        strip_path: false
    plugins:
      # Mẫu cho JSON APIs; chỉ áp dụng cho HTTP request, không áp dụng cho upload lớn.
      - name: request-size-limiting
        config:
          allowed_payload_size: 2
          size_unit: megabytes
          require_content_length: false
      # Mẫu quota ở edge; con số cần hiệu chỉnh theo tải và NAT/user behavior.
      - name: rate-limiting
        config:
          minute: 120
          limit_by: ip
          policy: local

  - name: notification-api
    url: http://notification-api:3001
    routes:
      - name: notification-list
        paths:
          - /api/v1/notifications
        methods: [GET, OPTIONS]
        strip_path: false
      - name: notification-mark-read
        paths:
          - /api/v1/notifications/mark-read
        methods: [POST, OPTIONS]
        strip_path: false
    plugins:
      - name: request-size-limiting
        config:
          allowed_payload_size: 2
          size_unit: megabytes
          require_content_length: false
      - name: rate-limiting
        config:
          minute: 120
          limit_by: ip
          policy: local

  - name: chat-api
    url: http://chat-api:8080
    routes:
      - name: chat-api-v1
        paths:
          - /api/v1/chat
        strip_path: false
      # Thêm WebSocket path thực tế sau khi chốt contract.
      # Kong hỗ trợ WebSocket upgrade qua route HTTP/HTTPS; không rewrite header Upgrade.
    plugins:
      - name: request-size-limiting
        config:
          allowed_payload_size: 2
          size_unit: megabytes
          require_content_length: false
      - name: rate-limiting
        config:
          minute: 120
          limit_by: ip
          policy: local

# Cố ý không có route cho email, mail templates, notification creation nội bộ,
# health endpoint, Kong Admin API hoặc database.
```

## 3. Ví dụ quota chặt hơn cho OTP

Gắn quota thấp hơn vào **route OTP thực tế** sau khi path được xác nhận trong OpenAPI. `/api/v1/auth/otp/send` dưới đây chỉ là tên minh họa:

```yaml
plugins:
  - name: rate-limiting
    route: core-auth-otp
    config:
      minute: 5
      limit_by: ip
      policy: local
```

Route được tham chiếu phải có tên trùng khớp:

```yaml
routes:
  - name: core-auth-otp
    paths:
      - /api/v1/auth/otp/send
    methods: [POST]
    strip_path: false
```

Con số `5/phút/IP` chỉ minh họa. Cần có service-level limit theo account/email/số điện thoại và cooldown/anti-enumeration; Kong không thể biết một request OTP có đang nhắm đúng tài khoản hoặc có vi phạm quy tắc nghiệp vụ hay không. Với nhiều Kong node, `policy: local` không tạo quota tổng; dùng Redis policy nếu cần bộ đếm chia sẻ.

## 4. Ý nghĩa và phạm vi của từng plugin

### CORS

Cho browser gọi API từ Web origin. `origins` phải là danh sách host đầy đủ theo environment. Nếu `credentials: true`, không dùng wildcard `*`. Header `Authorization` phải nằm trong allowlist vì browser gửi Bearer token. Mobile native không dựa vào CORS để bảo vệ API.

### Rate limiting

Mẫu `120/phút/IP/service` là hàng rào thô để giảm burst. Shared office/NAT có thể khiến nhiều user chung một IP nên cần theo dõi 429 trước khi chốt quota. JWT plugin hiện ánh xạ mọi token Keycloak về cùng một Kong Consumer; `limit_by: consumer` vì vậy sẽ gom quota của toàn bộ user, không phải quota riêng từng Keycloak user. Auth/OTP vẫn phải có quota nghiệp vụ trong Core.

- Một node dev: `policy: local` thường đủ để xem hành vi.
- Nhiều Kong node cần bộ đếm chung: cấu hình Redis và `policy: redis`.
- DB-less không dùng được `policy: cluster`; không nhầm Redis rate-limit policy với Redis của Notification/Chat nếu muốn cô lập credential và tải.

### Request size limiting

Mẫu 2 MB phù hợp để bắt đầu với JSON API, không phải quota đã được đo. Nếu có upload media, cho client upload bằng presigned URL tới object storage và giới hạn ở storage/upload-init API. Đừng nâng giới hạn cho toàn bộ gateway chỉ để hỗ trợ một endpoint upload.

### Request transformer

Loại một số header identity thường bị giả mạo. Core/Notification/Chat vẫn phải lấy danh tính từ JWT đã xác thực và phải bỏ qua header này kể cả khi request tới thẳng service trong môi trường dev. Không cấu hình plugin này để tự thêm `X-User-ID` từ JWT nếu Kong chưa xác thực token và chưa có thiết kế tin cậy header xuyên suốt.

### Request ID tích hợp của Kong

Kong Gateway 3.5+ tự tạo `X-Kong-Request-Id` cho mỗi request, ghi ID vào log và gửi cùng ID tới upstream. Mặc định, `headers` bật header này ở response và `headers_upstream` bật ở request tới service; các Compose gateway trong repo khai báo rõ hai giá trị đó. CORS đã cho phép trình duyệt đọc header này qua `exposed_headers`.

Sau khi đổi template local, `pnpm docker:gateway` sẽ render lại file Kong bị ignore và recreate gateway. Với production, cập nhật stack Portainer để nạp declarative config mới.

Không bật `correlation-id` với `header_name: X-Kong-Request-ID`: plugin và core Kong sẽ cùng ghi vào một header, trong khi Kong core dùng ID nội bộ để nối log với request upstream. Header name không phân biệt chữ hoa/chữ thường. Nếu cần một ID tuỳ chỉnh riêng, dùng tên khác như `X-Correlation-ID` và cập nhật CORS tương ứng.

### Prometheus

Bật các metric cơ bản để quan sát status, latency, bandwidth và upstream health. Endpoint scrape phải nằm trên Admin/status interface ở private management network. Không tạo một route public tới `/metrics`, và tránh nhãn per-consumer nếu chưa cần để không tăng cardinality.

## 5. Cách đưa mẫu này vào cấu hình chạy sau này

1. Chốt OpenAPI Core và path WebSocket; thay các route ví dụ bằng danh sách path đã duyệt.
2. Điền Web origins thật cho dev/staging/prod, mỗi môi trường một allowlist.
3. Chốt JSON body size và quota từ yêu cầu nghiệp vụ/load; quota OTP ở cả Kong (IP) lẫn Core (account/destination).
4. Gộp plugin/service/route entities vào template `kong.yml`, render credentials theo môi trường rồi mount `kong.generated.yml` cho DB-less Kong.
5. Kiểm tra file bằng Kong CLI cùng phiên bản image sẽ chạy, rồi mới đưa vào Compose/deploy. Admin API DB-less `/config` thay toàn bộ config trong memory, nên artifact cần chứa đủ Service, Route và Plugin; không upload riêng danh sách plugin.

## 6. Tài liệu Kong chính thức

- [CORS plugin](https://docs.konghq.com/hub/kong-inc/cors/)
- [Rate Limiting plugin và policy](https://docs.konghq.com/hub/kong-inc/rate-limiting/)
- [Request Size Limiting plugin](https://docs.konghq.com/hub/kong-inc/request-size-limiting/)
- [Request Transformer plugin](https://docs.konghq.com/hub/kong-inc/request-transformer/)
- [Request IDs trong Kong logs](https://developer.konghq.com/gateway/logs/)
- [Debug Kong Gateway requests](https://developer.konghq.com/gateway/debug-requests/)
- [Prometheus plugin](https://docs.konghq.com/hub/kong-inc/prometheus/)
- [Declarative configuration và cách gắn plugin](https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/)
