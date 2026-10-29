# Docker Compose cấu hình local

Các cấu hình Compose chạy dịch vụ hạ tầng của ba microservice được đặt trong thư mục này. Chạy lệnh bên dưới từ thư mục gốc `lens-backend`.

## Lens Backend

```sh
pnpm docker:up
```

Lệnh này tạo network Docker dùng chung tên `lens-network` nếu chưa có. Các Compose khác tham chiếu network này dưới dạng external nên lệnh `down` của một stack không xóa network. Nếu chỉ chạy một microservice riêng, tạo network trước bằng `pnpm docker:network`.
Lens Redis lấy mật khẩu từ `REDIS_PASSWORD` trong `.env` ở thư mục gốc; Notification dùng cùng giá trị này.

Để build và chạy API trong Docker bằng cấu hình runtime từ `.env.production`:

```sh
pnpm docker:backend
```

Hoặc build và khởi động cả API lẫn toàn bộ hạ tầng:

```sh
pnpm docker:all
```

Cổng trong container luôn là `3000`. Nếu cổng `3000` trên máy host đang được dùng, đổi riêng cổng host khi chạy:

Khi bật profile `app`, backend không publish port host; hãy gọi API qua Kong
ở `http://127.0.0.1:8000`.

Compose đọc `.env.production` bằng `env_file` khi tạo container; file này không được copy vào image và không được commit lên Git. Khi triển khai bằng Portainer, nhập cùng các biến vào phần **Environment variables** của Stack thay vì đưa file secret vào image.

Trong local Docker, backend dùng hostname nội bộ như `lens-postgres`, `lens-redis` và `lens-minio`; browser vẫn cần URL host như `http://localhost:9000` ở `S3_MINIO_PUBLIC_ENDPOINT` để upload trực tiếp lên MinIO.

Để bật thêm Keycloak và Kong DB-less cho Core API:

```sh
pnpm docker:gateway
pnpm docker:gateway:check
```

`docker:gateway` khởi động PostgreSQL/Keycloak, lấy các public RS256 signing key
từ JWKS của realm và tạo `.docker/kong/kong.generated.yml` (file bị Git ignore)
trước khi khởi động/recreate Kong. Realm phải được seed trước; nếu chưa có,
chạy `pnpm keycloak:seed`. Lệnh `docker:gateway:check` cần Keycloak/realm đang
chạy để dựng cấu hình rồi kiểm tra cú pháp Kong.

Gateway local nhận request tại `http://127.0.0.1:8000` và chỉ mở Admin API ở
`127.0.0.1:8001`. Core nhận public path `/api/v1/...` trực tiếp trong container;
Kong không rewrite path. Cấu hình route/plugin gốc nằm tại
[`.docker/kong/kong.yml`](kong/kong.yml); plugin JWT áp dụng cho API được bảo vệ,
còn route public được khai báo riêng. Backend vẫn tự xác thực đầy đủ JWT và
phân quyền. Sau khi xoay signing key Keycloak, chạy lại `pnpm docker:gateway` để
lấy JWKS mới và nạp lại Kong. Trước khi dùng staging/production, thay allowlist
CORS/upstream theo environment; không đưa Admin API hoặc Kong Manager ra Internet.

Trong chế độ phát triển, Chat Service chạy trên host theo `config/local.yaml` ở
cổng `3002`; Kong chuyển tiếp `/api/v1/chat/**` tới
`http://host.docker.internal:3002`. Khi Chat chạy cùng Kong trong Docker, dùng
DNS nội bộ `chat:8080` như cấu hình stack triển khai.

### Rate limit cho API client

Gateway có profile mặc định cho request JWT đã xác thực: tối đa **10 request/giây,
300 request/phút và 10.000 request/giờ** trên Consumer `keycloak`. Public route có
quota riêng theo IP (mặc định 60/phút); quota IP chung là 120/phút; login là
15/phút và các route gửi/khôi phục email là 5/phút. Client browser đọc được các
header `X-RateLimit-*`, `RateLimit-*` và `Retry-After` qua CORS để tự giãn request
và chờ khi nhận `429`.

Các quota dùng `policy: local`, phù hợp với Kong DB-less đang chạy một instance.
Counter nằm trong bộ nhớ từng instance và reset khi Kong khởi động lại; nếu scale
nhiều Kong instance, cần chuyển rate-limit policy sang Redis để các instance dùng
chung counter.

JWT plugin hiện ánh xạ signing-key `kid` vào một Consumer `keycloak` (cấu hình này
cũng cho phép nạp nhiều signing key khi xoay khóa). Vì vậy profile trên là quota
chung cho JWT client trong realm, không phải quota độc lập theo từng OAuth `azp`
hoặc từng user. Muốn tách quota theo từng client app cần cấp cho Kong một identity
riêng theo client; không nên dùng header client tự gửi làm identity rate-limit.

## Chat Service

Khởi động MongoDB replica set cho Chat:

```sh
docker compose -f .docker/chat-service/compose.yaml up -d
```

MongoDB của Chat có DNS `chat-mongodb` trong `lens-network`. Backend container kết nối bằng URI như `mongodb://chat-mongodb:27017/?replicaSet=rs0&directConnection=true`.

Muốn chạy cả Chat API trong container, đặt `MONGO_URI`, `KEYCLOAK_ISSUER`, `KEYCLOAK_AUDIENCE` và `KEYCLOAK_PUBLIC_KEY`, rồi chạy:

```sh
docker compose -f .docker/chat-service/docker-compose.backend.yaml up -d --build
```

Hoặc dùng script đã nối Chat vào cùng `lens-network`:

```sh
pnpm docker:chat
```

Kong route `/api/v1/chat/**` dùng DNS nội bộ `chat:8080`; Chat không publish
port host và chỉ nhận traffic từ mạng Docker nội bộ qua Kong.

Build context và Dockerfile của Chat API lấy từ checkout kế bên `../chat-service`; Dockerfile cùng `.dockerignore` vẫn nằm cạnh source code của service.

## Notification System

Một file Compose quản lý Kafka, Kafka UI, MongoDB và PostgreSQL; Notification dùng Redis chung của Lens. Khởi động Redis bằng `pnpm docker:up` trước, rồi bật hạ tầng Notification:

```sh
docker compose -f .docker/notification-system/compose.yaml up -d --remove-orphans
```

Có thể chỉ khởi động các service cần thiết bằng cách thêm tên service, ví dụ `kafka kafka-ui`.
Kafka UI và các container trong `lens-network` kết nối Kafka qua `kafka:9094` (PLAINTEXT); khi dùng listener này, bỏ `KAFKA_USERNAME` và `KAFKA_PASSWORD`. Notification dùng Redis Lens tại `lens-redis:6379`, mật khẩu `REDIS_PASSWORD` và DB `1`; Lens dùng DB mặc định `0`.

Notification production chạy trong container với DNS `notification:3001` trên
`lens-network`; Kong là ingress duy nhất cho REST và Socket.IO. Khi phát triển
Notification bằng `pnpm` trên máy host, đó chỉ là chế độ debug riêng và không
phải topology production.

## DNS trong network dùng chung

Trong container gắn vào `lens-network`, dùng cổng nội bộ và DNS sau. Các API
application không publish port host; client bên ngoài đi qua Kong:

| Service                              | Host trong `lens-network` | Cổng container |
| ------------------------------------ | ------------------------- | -------------: |
| Lens PostgreSQL                      | `lens-postgres`           |           5432 |
| Lens MongoDB                         | `mongodb`                 |          27017 |
| Redis (Lens DB 0, Notification DB 1) | `lens-redis`              |           6379 |
| Chat MongoDB                         | `chat-mongodb`            |          27017 |
| Notification PostgreSQL              | `notification-postgres`   |           5432 |
| Notification MongoDB                 | `notification-mongodb`    |          27017 |
| Kafka                                | `kafka`                   |           9094 |
| Kong proxy                           | `lens-kong`               |           8000 |
| Chat API                             | `chat`                    |           8080 |

Dùng đường dẫn Compose tương ứng với `down` để dừng từng nhóm. Vì Redis dùng chung, `pnpm docker:down` cũng làm Notification mất kết nối Redis. Lần áp dụng cấu hình này, `--remove-orphans` dừng container Redis Notification cũ nhưng giữ volume; job trong Redis cũ không được chuyển tự động.

Database và volume của từng service vẫn tách riêng; Notification và Lens chia sẻ Redis. DB Redis `0`/`1` tách key-space ở mức ứng dụng, không phải ranh giới bảo mật; cấu hình này dành cho local development.

## Cổng host

Chỉ Kong publish proxy cho client (mặc định `127.0.0.1:8000` trong local).
Các cổng host còn lại là cổng quản trị dependency hoặc UI; backend, Chat và
Notification không có cổng host trực tiếp.
