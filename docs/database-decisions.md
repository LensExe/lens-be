# PostgreSQL và TypeORM

[`migrations/001_lens.sql`](../migrations/001_lens.sql) định nghĩa schema khởi tạo; các [TypeORM entity](../src/shared/database/entities/) ánh xạ bảng cho mã ứng dụng. `pnpm db:migrate` chạy migration theo yêu cầu, ghi checksum vào `lens_migrations` và không chạy lại file đã áp dụng. TypeORM luôn đặt `synchronize: false`.

## Các bảng đang dùng

| Nhóm                 | Bảng                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Tài khoản            | `users`, `customers`, `admins`, `photographers`, `photographer_ratings`                                         |
| Gói và lịch          | `booking_plans`, `photographer_plans`, `subscriptions`, `subscription_status_history`, `offline_slots`          |
| Đặt lịch và nội dung | `bookings`, `booking_deliveries`, `media`, `portfolios`, `feedbacks`                                            |
| Tài chính            | `wallets`, `wallet_ledger`, `transactions`, `payment_webhooks`, `payment_escrow_settlements`, `refund_requests` |
| Quản trị và hạ tầng  | `reports`, `report_evidences`, `report_status_history`, `outbox_events`                                         |

Có 31 entity/bảng nghiệp vụ và hạ tầng sau các migration hiện có. ID dùng UUID; thời điểm dùng `timestamptz`; tiền VND dùng `bigint` và được transformer đổi thành number trong ứng dụng. Command và query hiện đều đọc/ghi cùng PostgreSQL qua TypeORM; không có read database riêng.

## Cấu trúc dữ liệu

- `photographers` chứa hồ sơ nghề nghiệp, bao gồm `description` và `started_career_at`.
- `users.status` nhận `active`, `suspended`, `banned`, `inactive`; domain Identity xử lý chuyển trạng thái. Tài khoản `banned` không được kích hoạt lại qua use case hiện tại.
- `booking_plans` thuộc một `photographer_id`; booking lưu `booking_plan_id`, `total_amount` snapshot và `gallery_published_at`.
- `photographer_plans.features`, `portfolios.items` và `booking_deliveries.media_ids` lưu dữ liệu dạng JSONB.
- Evidence của report nằm trong `report_evidences`; các lần tạo/chuyển trạng thái nằm trong `report_status_history`. Migration `020_moderation_report_workflow.sql` chuyển evidence hiện có từ JSONB sang bảng quan hệ và lưu trạng thái gần nhất cũ thành một event `imported`.
- `feedbacks` chứa `photographer_reply` và `replied_at`.
- `offline_slots` lưu `photographer_id`, `date`, `reason`; lịch trống được tính từ ngày nghỉ và booking hiện có.
- `subscriptions` thuộc `photographer_id`, lưu `start_at`, `end_at`, giá và `plan_snapshot` tại lúc mua. `subscription_status_history` lưu lần tạo, hủy gia hạn, kích hoạt thanh toán, timeout và hết hạn; migration `021_subscription_lifecycle.sql` lưu trạng thái hiện biết của dữ liệu cũ thành event `imported`.
- `media.upload_expires_at` giới hạn thời gian giữ chỗ dung lượng của presigned upload; migration `022_media_upload_expiry.sql` backfill các upload đang pending.
- Khiếu nại booking dùng `reports` với `target_type=booking`.

Các ràng buộc `CHECK`, `UNIQUE`, khóa ngoại và index nằm trong SQL migration; khi thêm use case mới cần đối chiếu cả migration lẫn entity. `001_lens.sql` dành cho database mới. Database đã có dữ liệu cần migration chuyển đổi riêng sau khi kiểm tra schema thực tế; không dùng file khởi tạo để nâng cấp trực tiếp.
