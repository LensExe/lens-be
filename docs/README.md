# TÀI LIỆU DỰ ÁN LENS BACKEND (DOCUMENTATION INDEX)

Chào mừng bạn đến với trung tâm tài liệu của dự án **Lens Backend** (FPT University - EXE202).

Thư mục này tập hợp toàn bộ các tài liệu hướng dẫn kỹ thuật, kiến trúc hệ thống và quy trình phát triển.

---

## 📚 Danh Mục Tài Liệu

| Tài liệu                                                                                                                              | Mô tả                                                                                                                                        | Đối tượng          |
| :------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| 🔐 **[Quản Lý Secrets & Biến Môi Trường](file:///Users/donhianh/Desktop/Code/FPT/sem8/exe202/lens-backend/docs/SECRETS_GUIDE.md)**    | Hướng dẫn cơ chế tự động mã hoá/giải mã SOPS + Age, quy trình Zero-touch commit & start app.                                                 | Tất cả developers  |
| 🏛️ **[Hướng Dẫn Kiến Trúc Clean / DDD](file:///Users/donhianh/Desktop/Code/FPT/sem8/exe202/lens-backend/docs/ARCHITECTURE_GUIDE.md)** | Quy tắc thiết kế và phân tầng module (`domain/`, `application/`, `infrastructure/`, `delivery/`). Khuôn mẫu từ module `booking`.             | Backend developers |
| 📦 **[Phân Chia 8 Modules Hệ Thống](file:///Users/donhianh/Desktop/Code/FPT/sem8/exe202/lens-backend/docs/MODULES_BREAKDOWN.md)**     | Đề xuất phân chia 18 bảng database thành 8 module cốt lõi (`user`, `photographer`, `booking`, `wallet`...) và cơ chế giao tiếp Event-Driven. | Backend developers |

---

## 🚀 Quick Start Cho Thành Viên Mới

1. **Clone repository**:
   ```bash
   git clone <repo-url>
   cd lens-backend
   ```
2. **Cài đặt dependencies**:
   ```bash
   pnpm install
   ```
3. **Cài đặt SOPS & Lưu Master Key**:
   - Xem chi tiết tại **[SECRETS_GUIDE.md](file:///Users/donhianh/Desktop/Code/FPT/sem8/exe202/lens-backend/docs/SECRETS_GUIDE.md)** để lấy khóa Age lưu vào `~/.lens-be/key.txt`.
4. **Khởi chạy môi trường Dev**:
   ```bash
   pnpm start:dev
   ```
   _(Hệ thống sẽ tự động giải mã cấu hình và khởi chạy NestJS core server)_
