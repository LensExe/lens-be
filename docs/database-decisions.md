# Database decisions trước triển khai

Nguồn: `Lens_API_Progress_Tracker.xlsm`, sheet API Tracker (87 mục), sơ đồ database người dùng cung cấp, cùng contract chat/notification đã có trong working tree. Các hướng dẫn phân công/cập nhật tracker trong Excel không phải yêu cầu thực thi.

## Ánh xạ và thay đổi

- Dùng PostgreSQL, UUID cho ID, timestamptz UTC cho mốc thời gian; tiền VND là số nguyên không âm, tối đa 9e12. Đây là lựa chọn kiểu dữ liệu vì hình không chỉ định kiểu.
- Giữ các bảng User, Customer, Admin, Photographer, Profile, Rating, WorkingSlot, OfflineSlot, BookingPlan, Feature, PhotographerPlan, Subscription, Booking, BookingDelivery, Feedback, Reply, Wallet, Transaction; tên SQL chuyển sang snake_case số nhiều.
- Photographer thêm `location`, `is_available`. Profile vẫn là hồ sơ nghề nghiệp; portfolio/portfolio_items tách riêng vì API có nhiều album, tiêu đề, cover và thứ tự ảnh.
- Booking thêm `total_amount` snapshot và `gallery_published_at`. Giá gói tại lúc đặt được giữ nguyên; tiền cọc mặc định 30%, làm tròn VND. BookingDelivery thêm `media_id` để tham chiếu media đã kiểm tra upload.
- Transaction giữ `concurrency` theo sơ đồ (ý nghĩa currency, chỉ VND), thêm `provider_order_code`, `checkout_url`, `qr_code`, `idempotency_key`; refund_requests và payment_webhooks lưu yêu cầu hoàn tiền và chống callback trùng. Không tự coi refund request là tiền đã hoàn.
- Subscription thêm `user_id`, `status`, `auto_renew`, `price`, `billing_cycle`; photographer_id trở thành nullable. Excel dùng Customer, hình dùng Photographer: user_id là chủ sở hữu thống nhất, photographer_id vẫn giữ cho dữ liệu photographer. Quyền API theo tracker.
- Feature thêm `photographer_plan_id`; `plan_id` chỉ trỏ BookingPlan. CHECK yêu cầu đúng một quan hệ plan, tránh khóa ngoại đa hình.
- Bổ sung device_tokens, media, portfolios, portfolio_items, booking_timeline, disputes, location_sessions, conversations, messages, message_reads, notifications, reports, report_history, outbox_events. Đây là dữ liệu cần cho endpoint nhưng thiếu trong sơ đồ.
- FK, UNIQUE user/keycloak, một hồ sơ mỗi user, một review mỗi booking, một delivery/media mỗi booking, và CHECK khoảng thời gian/số tiền/rating là ràng buộc mới. CQRS dùng cùng PostgreSQL với hai luồng đọc/ghi; không cần MongoDB hay sao chép dữ liệu để áp dụng CQRS.

## Chính sách mặc định cần chốt với SRS

- Đăng ký hồ sơ yêu cầu access token Keycloak hợp lệ (không yêu cầu đã có User); không nhận keycloak_id/role từ body dù tracker ghi Public.
- Chỉ photographer sở hữu booking được accept/reject/start/complete-shoot; customer hoặc photographer sở hữu được cancel trước start; Admin/System hoàn tất sau trả đủ tiền và publish gallery.
- Slot là khoảng UTC cụ thể; `day` là ISO weekday suy ra từ `from`. Chưa diễn giải thành lịch lặp hàng tuần.
- Sửa review trong 7 ngày; chỉ review booking completed. Media tối đa 100 MiB, chỉ ảnh JPEG/PNG/WebP, bucket private. Tracking chỉ từ một giờ trước lịch đến cuối lịch, dừng sẽ xóa tọa độ.
- Subscription mua theo kỳ trả trước; auto_renew biểu thị ý định, không có cơ chế tự động thu tiền khi chưa có mandate từ cổng thanh toán.
- Chat/notification chạy dưới dạng bounded context trong cùng ứng dụng; chưa triển khai thành các dịch vụ riêng. Outbox bền vững tạo notification center; gửi push/email cần cấu hình adapter riêng.

Migration chỉ tạo schema cho database mới, không DROP hay tự chuyển đổi database đang có. Với database hiện hữu cần migration chuyển dữ liệu sau khi kiểm tra schema thực tế. Không chạy migration lên database người dùng tự động.
