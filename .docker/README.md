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

```sh
BACKEND_HOST_PORT=3001 docker compose --env-file .env --profile app -f .docker/lens-backend/compose.yaml up -d --build lens-backend
```

Compose đọc `.env.production` bằng `env_file` khi tạo container; file này không được copy vào image và không được commit lên Git. Khi triển khai bằng Portainer, nhập cùng các biến vào phần **Environment variables** của Stack thay vì đưa file secret vào image.

Trong local Docker, backend dùng hostname nội bộ như `lens-postgres`, `lens-redis` và `lens-minio`; browser vẫn cần URL host như `http://localhost:9000` ở `S3_MINIO_PUBLIC_ENDPOINT` để upload trực tiếp lên MinIO.

Để bật thêm Keycloak và Kong:

```sh
docker compose --env-file .env -f .docker/lens-backend/compose.yaml --profile full up -d
```

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

Build context và Dockerfile của Chat API lấy từ checkout kế bên `../chat-service`; Dockerfile cùng `.dockerignore` vẫn nằm cạnh source code của service.

## Notification System

Một file Compose quản lý Kafka, Kafka UI, MongoDB và PostgreSQL; Notification dùng Redis chung của Lens. Khởi động Redis bằng `pnpm docker:up` trước, rồi bật hạ tầng Notification:

```sh
docker compose -f .docker/notification-system/compose.yaml up -d --remove-orphans
```

Có thể chỉ khởi động các service cần thiết bằng cách thêm tên service, ví dụ `kafka kafka-ui`.
Kafka UI và các container trong `lens-network` kết nối Kafka qua `kafka:9094` (PLAINTEXT); khi dùng listener này, bỏ `KAFKA_USERNAME` và `KAFKA_PASSWORD`. Notification dùng Redis Lens tại `redis:6379`, mật khẩu `REDIS_PASSWORD` và DB `1`; Lens dùng DB mặc định `0`.

## DNS trong network dùng chung

Trong container gắn vào `lens-network`, dùng cổng nội bộ và DNS sau; cổng host được map riêng để ứng dụng chạy trực tiếp trên máy truy cập:

| Service                              | Host trong `lens-network` | Cổng container |
| ------------------------------------ | ------------------------- | -------------: |
| Lens PostgreSQL                      | `lens-postgres`           |           5432 |
| Lens MongoDB                         | `mongodb`                 |          27017 |
| Redis (Lens DB 0, Notification DB 1) | `redis`                   |           6379 |
| Chat MongoDB                         | `chat-mongodb`            |          27017 |
| Notification PostgreSQL              | `notification-postgres`   |           5432 |
| Notification MongoDB                 | `notification-mongodb`    |          27017 |
| Kafka                                | `kafka`                   |           9094 |

Dùng đường dẫn Compose tương ứng với `down` để dừng từng nhóm. Vì Redis dùng chung, `pnpm docker:down` cũng làm Notification mất kết nối Redis. Lần áp dụng cấu hình này, `--remove-orphans` dừng container Redis Notification cũ nhưng giữ volume; job trong Redis cũ không được chuyển tự động.

Database và volume của từng service vẫn tách riêng; Notification và Lens chia sẻ Redis. DB Redis `0`/`1` tách key-space ở mức ứng dụng, không phải ranh giới bảo mật; cấu hình này dành cho local development.

## Cổng host

Một số service đang dùng chung cổng host: MongoDB của Chat và Notification cùng dùng `27017`; PostgreSQL của Notification và Lens Backend cùng dùng `5433`; Kafka UI và Chat API cùng dùng `8080`. Nếu cần chạy đồng thời các stack có cổng trùng nhau, hãy đổi cổng host ở Compose tương ứng và cập nhật URI/URL kết nối của service đó.
