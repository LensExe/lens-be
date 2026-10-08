# Ví dụ cấu hình plugin Kong cho Lens

**Mục đích:** cho phép review plugin và config trước khi tích hợp vào gateway. Đây là cấu hình tham khảo, **chưa được Compose mount hoặc bật**. Các path route là ví dụ; phải thay bằng path chính xác trong OpenAPI sau khi Core hoàn tất.

## 1. Plugin nào nên có ở v1?

| Plugin / tính năng      | Mức độ                             | Dùng để làm gì                                                  | Giới hạn cần nhớ                                                                                                            |
| ----------------------- | ---------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `cors`                  | Cần cho Web chạy khác origin       | Trả CORS headers và xử lý preflight cho browser                 | Dùng origin cụ thể theo môi trường; không dùng `*` khi bật credentials. Mobile native thường không cần CORS.                |
| `rate-limiting`         | Nên có                             | Hạn chế burst/abuse theo IP hoặc service ở edge                 | `local` đếm riêng trên từng Kong instance. Giới hạn theo tài khoản/email/số điện thoại vẫn phải làm trong service.          |
| `request-size-limiting` | Nên có                             | Chặn body quá lớn trước khi vào backend                         | Giới hạn mẫu dưới đây là 2 MB cho API JSON; điều chỉnh theo DTO thực tế. Upload file nên dùng object storage có URL ký sẵn. |
| `request-transformer`   | Nên có như lớp phòng thủ phụ       | Loại các header danh tính giả do client tự gửi                  | Backend vẫn phải bỏ qua các header đó và xác thực JWT. Plugin này không thay guard.                                         |
| `correlation-id`        | Nên có                             | Gắn request ID để nối log Kong với log service                  | Request ID chỉ dùng tracing, không được dùng làm danh tính hay bằng chứng bảo mật.                                          |
| `prometheus`            | Khuyến nghị cho staging/production | Xuất metric request, status, latency, bandwidth/upstream health | Chỉ cho Prometheus scrape qua mạng quản trị riêng; không tạo public route `/metrics`.                                       |

### Không bật ở v1

- **`jwt`:** chưa dùng làm lớp xác thực chính. Các service đã xác thực Keycloak access token; thêm Kong JWT có thể yêu cầu đăng ký credentials/consumer theo cách khác và tạo hai nơi kiểm token. Chỉ xem xét lại khi đã thiết kế rõ Keycloak/OIDC, cách Kong xác minh token và header trust.
- **`openid-connect`:** không đưa vào cấu hình mặc định; kiểm tra edition/license và mô hình đăng nhập trước khi chọn.
- **`acl`, `key-auth`:** không dùng thay role/scope Keycloak hoặc object-level authorization của service.
- **`proxy-cache`, response transformer, bot detection:** chưa có yêu cầu cụ thể; không bật mặc định cho API người dùng/payment.
- **Logging plugin gửi request/response body:** không bật mặc định vì có thể đưa token, OTP, PII hoặc nội dung email vào hệ thống log. Dùng access/error log đã cấu hình redact.

## 2. Mẫu declarative config để review

Plugin ở top-level `plugins` áp dụng toàn cục. Plugin nằm trong một service chỉ áp dụng cho service đó. Với plugin áp dụng đồng thời cho nhiều entity, cấu hình ở top-level và tham chiếu entity bằng tên. Đây là cú pháp Kong declarative config; các service name bên dưới dự kiến là DNS alias trong private Docker network.

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
        - X-Kong-Request-ID
      exposed_headers:
        - X-Kong-Request-ID
      credentials: true
      max_age: 3600
      preflight_continue: false
      allow_origin_absent: true

  # Gắn một ID xuyên suốt Kong -> service.
  - name: correlation-id
    config:
      header_name: X-Kong-Request-ID
      generator: uuid
      echo_downstream: true

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

Mẫu `120/phút/IP/service` là hàng rào thô để giảm burst. Shared office/NAT có thể khiến nhiều user chung một IP nên cần theo dõi 429 trước khi chốt quota. Do service chưa được xác thực thành Kong Consumer, không đặt `limit_by: consumer` rồi giả định Kong đã nhận ra Keycloak user. Auth/OTP vẫn phải có quota nghiệp vụ trong Core.

- Một node dev: `policy: local` thường đủ để xem hành vi.
- Nhiều Kong node cần bộ đếm chung: cấu hình Redis và `policy: redis`.
- DB-less không dùng được `policy: cluster`; không nhầm Redis rate-limit policy với Redis của Notification/Chat nếu muốn cô lập credential và tải.

### Request size limiting

Mẫu 2 MB phù hợp để bắt đầu với JSON API, không phải quota đã được đo. Nếu có upload media, cho client upload bằng presigned URL tới object storage và giới hạn ở storage/upload-init API. Đừng nâng giới hạn cho toàn bộ gateway chỉ để hỗ trợ một endpoint upload.

### Request transformer

Loại một số header identity thường bị giả mạo. Core/Notification/Chat vẫn phải lấy danh tính từ JWT đã xác thực và phải bỏ qua header này kể cả khi request tới thẳng service trong môi trường dev. Không cấu hình plugin này để tự thêm `X-User-ID` từ JWT nếu Kong chưa xác thực token và chưa có thiết kế tin cậy header xuyên suốt.

### Correlation ID

`X-Kong-Request-ID` chỉ để đối chiếu log. Có thể trả header này về client và ghi cùng ID tại service. Không đặt dữ liệu nhạy cảm vào ID. Nếu muốn bảo đảm client không tự chọn ID, phải strip header do client gửi trước khi plugin correlation-id tạo ID; dù vậy, ID vẫn chỉ là tracing metadata.

### Prometheus

Bật các metric cơ bản để quan sát status, latency, bandwidth và upstream health. Endpoint scrape phải nằm trên Admin/status interface ở private management network. Không tạo một route public tới `/metrics`, và tránh nhãn per-consumer nếu chưa cần để không tăng cardinality.

## 5. Cách đưa mẫu này vào cấu hình chạy sau này

1. Chốt OpenAPI Core và path WebSocket; thay các route ví dụ bằng danh sách path đã duyệt.
2. Điền Web origins thật cho dev/staging/prod, mỗi môi trường một allowlist.
3. Chốt JSON body size và quota từ yêu cầu nghiệp vụ/load; quota OTP ở cả Kong (IP) lẫn Core (account/destination).
4. Gộp plugin/service/route entities này vào declarative `kong.yml` duy nhất, mount cho DB-less Kong.
5. Kiểm tra file bằng Kong CLI cùng phiên bản image sẽ chạy, rồi mới đưa vào Compose/deploy. Admin API DB-less `/config` thay toàn bộ config trong memory, nên artifact cần chứa đủ Service, Route và Plugin; không upload riêng danh sách plugin.

## 6. Tài liệu Kong chính thức

- [CORS plugin](https://docs.konghq.com/hub/kong-inc/cors/)
- [Rate Limiting plugin và policy](https://docs.konghq.com/hub/kong-inc/rate-limiting/)
- [Request Size Limiting plugin](https://docs.konghq.com/hub/kong-inc/request-size-limiting/)
- [Request Transformer plugin](https://docs.konghq.com/hub/kong-inc/request-transformer/)
- [Correlation ID plugin](https://docs.konghq.com/hub/kong-inc/correlation-id/)
- [Prometheus plugin](https://docs.konghq.com/hub/kong-inc/prometheus/)
- [Declarative configuration và cách gắn plugin](https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/)
