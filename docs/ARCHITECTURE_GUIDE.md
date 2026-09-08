# HƯỚNG DẪN KIẾN TRÚC PHÁT TRIỂN MODULE (PRAGMATIC CLEAN / DDD)

> **LƯU Ý QUAN TRỌNG DÀNH CHO TEAM MEMBERS:**  
> Module `booking` ([src/modules/booking/](file:///Users/donhianh/Desktop/Code/FPT/sem8/exe202/lens-backend/src/modules/booking)) được thiết lập làm **Khuôn Mẫu Chuẩn (Gold Standard Template)** cho toàn bộ dự án `lens-backend`. Khi bạn tạo hoặc phát triển các module mới (`lens`, `user`, `order`, `payment`...), vui lòng tuân thủ cấu trúc và quy tắc phân tầng dưới đây.

---

## 1. Tổng Quan Cấu Trúc Thư Mục

```text
src/modules/booking/
├── booking.module.ts                         # NestJS Module: Khai báo DI, kết nối Service và Repository
│
├── domain/                                   # TẦNG 1: NGHIỆP VỤ LÕI (Không phụ thuộc Framework)
│   ├── entities/
│   │   └── booking.domain-entity.ts          # Chứa dữ liệu nghiệp vụ & phương thức xử lý (business rules)
│   ├── enums/
│   │   └── booking-status.enum.ts            # Định nghĩa các trạng thái (PENDING, CONFIRMED, CANCELLED...)
│   └── repositories/
│       └── booking.repository.interface.ts   # Interface Repository (Port) & Token Injection
│
├── application/                              # TẦNG 2: ĐIỀU PHỐI USE-CASES & DTO
│   ├── services/
│   │   └── booking.service.ts                # Application Service: Gọi repo, xử lý luồng use-case
│   └── dto/
│       ├── create-booking.dto.ts             # Input DTO nhận dữ liệu từ Controller
│       └── booking-response.dto.ts           # Output DTO chuẩn hóa dữ liệu trả về cho Client
│
└── infrastructure/                           # TẦNG 3: HẠ TẦNG & CƠ SỞ DỮ LIỆU
    ├── entities/
    │   └── booking.orm-entity.ts             # Model bảng Database (TypeORM Entity)
    ├── mappers/
    │   └── booking.mapper.ts                 # Chuyển đổi 2 chiều: ORM Entity ⮂ Domain Entity
    └── repositories/
        └── booking.repository.ts             # Triển khai thực tế IBookingRepository (sử dụng Mapper)
```

> **Tầng Delivery (Nhận Request từ bên ngoài)**:  
> Controller được đặt tại `src/features/api/http/booking.controller.ts` để tách biệt hoàn toàn giao thức HTTP khỏi logic nghiệp vụ.

---

## 2. Trách Nhiệm Của Từng Tầng

### 🟢 1. Tầng Domain (`domain/`)

- **Trách nhiệm**: Nắm giữ toàn bộ luật nghiệp vụ cốt lõi của bài toán.
- **Nguyên tắc vàng**:
  - **HOÀN TOÀN ĐỘC LẬP**: Không import bất kỳ thứ gì từ NestJS (`@Injectable`, `@Controller`), TypeORM, hay thư viện bên ngoài.
  - **Domain Entity (`*.domain-entity.ts`)**: Không chỉ chứa thuộc tính, mà phải chứa logic thay đổi trạng thái và xác thực nghiệp vụ (ví dụ: hàm `confirm()`, `cancel()`).
  - **Repository Interface (`*.repository.interface.ts`)**: Định nghĩa hợp đồng những gì Domain cần (lưu, tìm, xóa), KHÔNG quan tâm đến database là PostgreSQL, MongoDB hay Redis.

### 🟡 2. Tầng Application (`application/`)

- **Trách nhiệm**: Nhận yêu cầu từ tầng Delivery (Controller), điều phối các đối tượng Domain và gọi Repository để hoàn thành Use-Case.
- **Nguyên tắc vàng**:
  - Nhận dữ liệu đầu vào qua **Input DTO** và trả về qua **Output DTO** (tránh trả trực tiếp Domain Entity hoặc ORM Entity ra ngoài).
  - Inject Repository thông qua Token interface (`@Inject(BOOKING_REPOSITORY)`), không inject trực tiếp class cụ thể của database.

### 🔵 3. Tầng Infrastructure (`infrastructure/`)

- **Trách nhiệm**: Xử lý các chi tiết kỹ thuật: kết nối database, gọi query TypeORM, lưu file, gửi email.
- **Các thành phần cốt lõi**:
  - **ORM Entity (`*.orm-entity.ts`)**: Định nghĩa cấu trúc bảng trong PostgreSQL (các cột `@Column`, quan hệ `@ManyToOne`).
  - **Mapper (`*.mapper.ts`)**: Đảm bảo sự tách biệt giữa Database và Domain:
    - `toDomain(orm)`: Chuyển dữ liệu thô từ Database thành đối tượng Domain Entity giàu nghiệp vụ.
    - `toOrm(domain)`: Chuyển Domain Entity thành bản ghi ORM để lưu vào Database.
  - **Repository (`*.repository.ts`)**: Triển khai `implements IBookingRepository`. Sử dụng Mapper để chuyển đổi trước khi lưu hoặc sau khi lấy từ Database.

### 🟣 4. Tầng Delivery (`src/features/api/http/`)

- **Trách nhiệm**: Tiếp nhận HTTP Request (REST API), validate dữ liệu và trả response HTTP.
- **Nguyên tắc vàng**:
  - Controller **chỉ được gọi Service**, tuyệt đối không gọi thẳng Repository hay tự viết query database trong Controller.

---

## 3. Sơ Đồ Luồng Dữ Liệu & Vai Trò Của Mapper

```text
[ Client (Frontend / Mobile) ]
       │  HTTP Request (JSON)
       ▼
[ Controller ] (features/api/http/booking.controller.ts)
       │  CreateBookingDto
       ▼
[ Application Service ] (application/services/booking.service.ts)
       │  BookingDomainEntity (thực thi logic confirm / cancel)
       ▼
[ Repository Implementation ] (infrastructure/repositories/booking.repository.ts)
       │
       ├──► [ Mapper.toOrm() ] ────► BookingOrmEntity ────► [ PostgreSQL / TypeORM ]
       │                                                            │
       └──◄ [ Mapper.toDomain() ] ◄── BookingOrmEntity ◄────────────┘
```

---

## 4. Quy Tắc Chiều Phụ Thuộc (Dependency Rule)

Luồng phụ thuộc phải đi **một chiều từ ngoài vào trong**:

$$\text{Controller (Delivery)} \longrightarrow \text{Service (Application)} \longrightarrow \text{Domain (Core)}$$
$$\text{Infrastructure (Repo + Mapper)} \longrightarrow \text{Domain (Interface + Domain Entity)}$$

- **Domain** không biết ai đang gọi mình (không import Application, Infrastructure hay Delivery).
- **Application** chỉ phụ thuộc vào Domain (gọi Domain Entity và Repository Interface).
- **Infrastructure** phụ thuộc vào Domain để hiện thực hóa các Interface.
- **Delivery** chỉ phụ thuộc vào Application Service và DTO.
