# Thư mục Tài liệu Lens Backend 📚

Tài liệu dưới đây mô tả mã nguồn, quyết định kiến trúc và cấu hình chi tiết của dự án. Xem tài liệu tổng quan tại **[README.md chính của dự án](../README.md)**.

## Danh mục tài liệu chuyên sâu

| Tài liệu                                                                                    | Nội dung                                                                                               |
| :------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------- |
| 🏛️ **[Kiến trúc (ARCHITECTURE_GUIDE.md)](ARCHITECTURE_GUIDE.md)**                           | Pragmatic Clean Architecture, luồng xử lý CQRS, domain logic, use cases và phân tầng Ports & Adapters. |
| ⚙️ **[Triển khai & Vận hành (backend-implementation.md)](backend-implementation.md)**       | Cấu hình runtime, chi tiết luồng nghiệp vụ Booking/Payment, cơ chế Transactional Outbox và kiểm thử.   |
| 🗄️ **[Quyết định Database (database-decisions.md)](database-decisions.md)**                 | Cấu trúc 20 TypeORM Entities, schema SQL và quy trình quản lý migration an toàn.                       |
| 🔑 **[Đăng nhập Google qua Keycloak (keycloak-google-login.md)](keycloak-google-login.md)** | Cấu hình Identity Provider Google Brokering và luồng đăng nhập trao đổi token.                         |
| 🔐 **[Bảo mật Secrets & Biến môi trường (SECRETS_GUIDE.md)](SECRETS_GUIDE.md)**             | Hướng dẫn cấu hình SOPS và Age key để mã hóa biến môi trường tự động (Zero-touch).                     |
| 📋 **[API Tracker (api-tracker.json)](api-tracker.json)**                                   | Danh sách theo dõi toàn bộ 80 Operation ID HTTP đang được quản lý.                                     |

---

## Hướng dẫn Chạy nhanh

```bash
# 1. Cài đặt thư viện
pnpm install

# 2. Bật các container phụ trợ (PostgreSQL, Redis, MinIO)
pnpm docker:up

# 3. Áp dụng migration vào database
pnpm db:migrate

# 4. Chạy server ở chế độ development
pnpm start:dev
```

> **Lưu ý**:
>
> - `pnpm docker:up` chỉ bật nhóm service mặc định. Nếu cần Keycloak và Kong cục bộ, chạy `docker compose -f .docker/compose.yaml --profile full up -d` và cấu hình `.env` tương ứng.
> - `001_lens.sql` dùng để khởi tạo database mới. Xem thêm [database-decisions.md](database-decisions.md) để biết thêm chi tiết về quy trình migration.
