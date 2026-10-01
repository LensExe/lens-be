# Payment — Phân tích nghiệp vụ trước khi triển khai

> Tài liệu dùng để thống nhất nghiệp vụ Payment trước khi sửa code trong `src/modules/payment/`. Nội dung phân biệt rõ phần hiện có trong repo, phần đề xuất và những chính sách cần chủ sản phẩm xác nhận.

## 1. Mục tiêu của Payment

Payment ghi nhận và theo dõi các khoản tiền phát sinh trong Lens. Một khoản tiền chỉ được coi là đã thanh toán sau khi backend xác minh được giao dịch từ PayOS hoặc sau khi ví nội bộ được ghi nợ thành công.

Các nhu cầu nghiệp vụ cần làm rõ:

1. Khách hàng thanh toán tiền cọc và phần còn lại cho booking.
2. Nhiếp ảnh gia thanh toán phí subscription.
3. Người dùng nạp và sử dụng số dư ví Lens, nếu sản phẩm bật ví nội bộ.
4. Admin tiếp nhận và xử lý yêu cầu hoàn tiền.
5. Booking và Subscription tra cứu số tiền đã được xác nhận để quyết định bước tiếp theo.

## 2. Phạm vi đang có và phạm vi đề xuất

### Đang có trong runtime

- Thanh toán booking bằng PayOS: tạo intent cho `deposit` hoặc `remaining`, lấy QR/checkout URL và xác nhận bằng webhook.
- Thanh toán subscription qua Payment port và webhook.
- Đọc transaction, lịch sử payment, QR, refund requests và danh sách payment cho admin.
- Tạo refund request cho transaction đã trả; đây là ghi nhận yêu cầu, chưa phải lệnh chuyển tiền hoàn.
- `WalletEntity` đã được tạo cùng hồ sơ user, nhưng chưa có API/use case runtime để nạp ví hoặc trả booking bằng ví.

### Đề xuất cần quyết định

- Nạp ví bằng PayOS.
- Chọn `PayOS` hoặc `wallet` khi thanh toán booking.
- Dùng `frozen_balance` làm tiền escrow, rồi giải ngân hoặc hoàn lại theo trạng thái booking.
- Sổ cái bất biến để đối soát các lần tăng/giảm số dư ví.

Không nên xem `wallet_internal` trong enum hoặc file `PaymentCollectionUseCases` là ví đã hoạt động. Luồng đó chưa được wiring vào Payment API hiện tại.

## 3. Vai trò liên quan

| Vai trò              | Trách nhiệm trong Payment                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Customer**         | Tạo payment cho booking; có thể nạp và dùng ví nếu chức năng được bật; xem transaction của mình.                                            |
| **Photographer**     | Xem payment gắn với booking của mình; nhận tiền vào ví nếu Lens có escrow/settlement.                                                       |
| **Admin**            | Theo dõi transaction, tạo yêu cầu refund theo chính sách đã thống nhất. Runtime hiện tại chưa có luồng riêng để duyệt hoặc thực thi refund. |
| **Payment provider** | Tạo checkout/QR và gửi webhook kết quả giao dịch.                                                                                           |
| **Booking**          | Sở hữu trạng thái booking; hỏi Payment tổng tiền đã trả hoặc yêu cầu Payment giải ngân/đảo hold qua port.                                   |
| **Subscription**     | Sở hữu trạng thái subscription; yêu cầu Payment tạo payment intent và nhận kết quả qua port/webhook.                                        |

Theo `MODULES_BREAKDOWN.md`, Identity khởi tạo wallet khi tạo profile. Payment chịu trách nhiệm thay đổi số dư sau đó; không gọi trực tiếp Identity use case. Booking và Subscription không sửa `WalletEntity` hoặc `TransactionEntity` trực tiếp.

## 4. Khái niệm nghiệp vụ

- **Payment intent:** ý định thu một khoản tiền; ban đầu `pending`, gắn với một nghiệp vụ và có thể gắn với mã đơn hàng bên provider.
- **Transaction:** bản ghi Lens theo dõi khoản tiền cần thu/đã thu, method, amount và kết quả.
- **Deposit:** khoản cọc của booking. Giá trị lấy từ booking, không lấy từ client.
- **Remaining:** phần còn lại của booking. Theo implementation hiện tại là `total_amount - deposit_amount`.
- **Wallet balance:** số tiền user có thể sử dụng.
- **Frozen balance:** số tiền đang bị giữ; không thể dùng để thanh toán hoặc rút.
- **Webhook:** thông báo từ provider; chữ ký hợp lệ mới cho phép thay đổi trạng thái tiền.
- **Refund request:** yêu cầu xử lý refund. `requested` chưa đồng nghĩa tiền đã được trả lại.

Tiền dùng VND nguyên. Client không có quyền quyết định amount, trạng thái `paid`, gateway order code hay kết quả refund.

## 5. Luồng nghiệp vụ hiện tại: PayOS cho booking

### 5.1. Tiền cọc

1. Booking đã ở trạng thái cho phép thanh toán; customer chọn thanh toán cọc.
2. Lens lấy `deposit_amount` từ booking và tạo hoặc lấy lại transaction intent loại `deposit`.
3. Intent được lưu trước khi Lens gọi PayOS. PayOS trả checkout URL và QR để client hiển thị.
4. Customer thanh toán bên PayOS.
5. PayOS gửi webhook đến Lens. Backend xác minh chữ ký, order code và số tiền.
6. Nếu hợp lệ, transaction chuyển sang `paid`; Payment phát sự kiện để các bên nhận biết.
7. Booking hỏi Payment tổng tiền đã trả. Buổi chụp chỉ được bắt đầu khi đã đủ cọc.

### 5.2. Phần thanh toán còn lại

1. Customer chỉ được tạo payment remaining sau khi transaction deposit đã `paid`.
2. Amount là `total_amount - deposit_amount` theo dữ liệu booking.
3. Kết quả chỉ chuyển sang `paid` sau webhook đã xác minh.
4. Booking chỉ được hoàn tất khi tổng các payment loại `deposit` và `remaining` đã trả đủ, đồng thời các điều kiện bàn giao ảnh được đáp ứng.

### 5.3. Subscription

1. Photographer chọn plan đang hoạt động.
2. Subscription yêu cầu Payment tạo/reuse transaction loại `subscription`.
3. PayOS tạo checkout; webhook hợp lệ chuyển transaction sang `paid` và subscription sang `active`.
4. Subscription query gói và quyền lợi từ Subscription context, không tự diễn giải transaction.

### 5.4. Refund request

- Admin/system tạo refund request cho một transaction đã trả; API hiện tại ghi nhận và cho phép tra cứu request, chưa thực hiện bước duyệt/chuyển tiền hoàn.
- Amount refund không được vượt phần tiền chưa có refund request đang hiệu lực.
- Việc tạo request chỉ ghi nhận quy trình xử lý. Chỉ khi provider xác nhận hoàn tiền hoặc nghiệp vụ wallet reverse hoàn tất mới được coi là refund `completed`.

## 6. Luồng đề xuất: ví nội bộ

Các luồng sau là đề xuất, chưa được triển khai trong runtime.

### 6.1. Nạp ví

1. User nhập amount và gửi idempotency key.
2. Lens tạo transaction loại top-up ở trạng thái pending, gắn user và order code PayOS.
3. PayOS tạo checkout/QR.
4. Webhook hợp lệ xác nhận đúng provider, order code, amount và reference.
5. Trong cùng database transaction, Lens đánh dấu transaction paid, cộng amount vào wallet balance và ghi sổ cái.

**Quy tắc:** redirect URL không cộng tiền; webhook lặp không được cộng ví lần hai; webhook amount/order mismatch không thay đổi balance.

### 6.2. Trả booking bằng ví

1. Customer chọn `wallet` cho payment deposit hoặc remaining.
2. Lens lấy amount từ booking, kiểm tra trạng thái và quyền customer.
3. Lens khóa wallet trong transaction, kiểm tra đủ balance rồi trừ tiền khả dụng.
4. Nếu chính sách dùng escrow, số tiền tương ứng được cộng vào frozen balance của photographer.
5. Payment transaction chuyển sang paid trong cùng lần commit với các thay đổi số dư.
6. Booking nhận tổng tiền đã trả qua Payment port như với PayOS.

Giai đoạn đầu nên yêu cầu đủ số dư cho toàn bộ deposit/remaining; không trừ một phần nếu ví không đủ và không trộn nhiều phương thức trong cùng một payment intent.

### 6.3. Giữ, giải ngân và hoàn lại tiền

Quy tắc escrow đang áp dụng:

- Tiền booking đã thu được đưa vào `frozen_balance` của photographer, bất kể khách trả qua gateway hay ví.
- Khi booking hoàn tất, Payment đặt mốc giải ngân sau 72 giờ. Đến hạn, phần không gắn với refund request đang mở được chuyển sang `balance`.
- Customer có thể gửi refund request trên booking đã hoàn tất trước mốc giải ngân. Request đang mở tiếp tục giữ phần tiền tương ứng sau mốc đó cho đến khi admin duyệt hoặc từ chối.
- Booking bị hủy, từ chối hoặc hết hạn đi theo cancellation refund request riêng; tiền đã thu tiếp tục được giữ cho đến khi request được xử lý.
- Booking không cập nhật ví trực tiếp; Payment sở hữu mọi thay đổi wallet.

Commission, thuế/phí nền tảng và quy tắc phân xử tranh chấp ngoài refund request vẫn chưa nằm trong phạm vi implementation.

## 7. Quy tắc và invariants cần bảo đảm

### Amount và nguồn dữ liệu

- Amount được tính từ `BookingEntity` hoặc `PhotographerPlanEntity` trong database.
- Amount là số nguyên VND dương, không vượt giới hạn SQL.
- Không chấp nhận amount hoặc trạng thái thanh toán do client tự gửi làm kết quả.

### Idempotency

- Cùng `user_id` và `idempotency_key` với cùng nghiệp vụ/amount/method phải trả lại intent cũ.
- Dùng lại key cho dữ liệu khác phải trả conflict.
- Mỗi booking chỉ có một intent deposit và một intent remaining theo ràng buộc hiện tại.
- Cùng provider webhook reference chỉ được xử lý side effect một lần.

### Trạng thái tiền

- Callback thành công, đúng chữ ký/order/amount chuyển `pending -> paid`; callback thất bại giữ `pending` để chờ callback thành công hoặc đối soát.
- `paid` không bị callback cũ đổi ngược thành pending/failed.
- Webhook chỉ xác nhận đúng payment provider, order code, amount và success status.
- Provider timeout khi tạo checkout không làm mất payment intent; retry dùng cùng order code.

### Ví

- `balance` và `frozen_balance` không được âm.
- Chỉ `balance` được dùng cho chi tiêu; `frozen_balance` không khả dụng.
- Lock wallet khi ghi để ngăn hai payment đồng thời tiêu cùng một số dư.
- Các thay đổi liên quan trong từng luồng phải nhất quán trong cùng database transaction: ví dụ webhook top-up cập nhật transaction, wallet, ledger, webhook dedup và outbox event; wallet payment cập nhật transaction, wallet, ledger và outbox event.

### Refund

- Chỉ transaction paid mới được yêu cầu refund.
- Tổng amount refund đang được yêu cầu/duyệt/hoàn tất không vượt số tiền đã thu.
- Refund request không tự đồng nghĩa provider refund đã thành công.
- Callback refund (nếu có provider integration) cũng phải idempotent và được lưu/đối soát.

## 8. Các trường hợp cần xử lý

| Tình huống                                                   | Kết quả nghiệp vụ đề xuất                                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Client bấm thanh toán lặp                                    | Reuse payment intent theo idempotency/business key; không tạo hai khoản cần thu.             |
| PayOS tạo link timeout nhưng đã tạo order                    | Giữ intent; retry đối soát cùng provider order code rồi trả link hiện có nếu amount khớp.    |
| Webhook gửi lặp                                              | Acknowledge duplicate, không cộng balance hoặc phát side effect lần nữa.                     |
| Webhook sai chữ ký/order/amount                              | Không cập nhật transaction, wallet hoặc booking; ghi log an toàn để điều tra.                |
| Webhook thất bại có chữ ký hợp lệ                            | Giữ transaction `pending`; không coi là paid.                                                |
| Tiền về sau khi booking đã hủy                               | Giữ ghi nhận paid; tạo case refund/settlement theo policy, không xóa giao dịch.              |
| Wallet không đủ tiền                                         | Từ chối toàn bộ intent wallet, không debit một phần.                                         |
| Hai payment cùng tiêu wallet                                 | Một transaction lấy lock trước; transaction sau kiểm tra số dư mới và thất bại nếu không đủ. |
| Provider callback đến đồng thời hai lần                      | Unique `(provider, reference)` và transaction lock bảo đảm side effect một lần.              |
| Refund lớn hơn số dư có thể hoàn                             | Từ chối trước khi gọi provider/ghi completed.                                                |
| Wallet payment bị retry sau commit nhưng client mất response | Idempotency trả lại kết quả đã commit, không debit lần hai.                                  |

## 9. Entity mapping và giới hạn dữ liệu hiện có

| Entity                                 | Ý nghĩa nghiệp vụ                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `WalletEntity`                         | Số dư khả dụng và đang giữ cho một user.                                                                                              |
| `TransactionEntity`                    | Intent/kết quả của deposit, remaining, subscription, wallet top-up, refund và withdrawal. Lưu provider order/QR và idempotency key.   |
| `PaymentWebhookEntity`                 | Dấu vết webhook đã xử lý, khóa duy nhất theo provider/reference.                                                                      |
| `RefundRequestEntity`                  | Dùng chung cho refund hủy booking, customer request và withdrawal; lưu trạng thái duyệt/hoàn tất, audit actor và đích nhận đã mã hóa. |
| `BookingEntity` / `SubscriptionEntity` | Nguồn dữ liệu nghiệp vụ để xác định amount và trạng thái liên quan.                                                                   |
| `WalletLedgerEntity`                   | Journal bất biến cho delta số dư `available/frozen`, có khóa idempotency và liên kết transaction/request.                             |

### Schema được mở rộng bởi migration 018

- Mở rộng transaction types và cho phép `reference_id` / `provider_order_code` null với giao dịch nội bộ.
- Mở rộng `refund_requests` cho ba loại request và metadata duyệt/payout; backfill booking liên quan từ refund rows cũ.
- Tạo `wallet_ledger`, backfill ví còn thiếu và ghi số dư hiện có thành opening entry.

Migration `001_lens.sql` được giữ nguyên; schema payment/wallet/refund nằm ở `018_payment_wallet_refunds.sql`, và deadline giải ngân escrow nằm ở `019_payment_escrow_hold.sql`.

## 10. Ownership theo MODULES_BREAKDOWN

- **Payment context:** payment intent, transaction status, provider webhook, wallet balance mutation, refund request và tổng tiền đã trả.
- **Identity context:** khởi tạo wallet khi tạo user profile; không xử lý payment sau onboarding.
- **Booking context:** booking lifecycle và điều kiện nào cần đủ cọc/đủ tiền. Booking truy vấn Payment bằng `PaidAmountsPort`; giải ngân/đảo hold thì Booking khai báo port ở phía mình.
- **Subscription context:** plan/subscription lifecycle; gọi `SubscriptionPaymentsPort` để yêu cầu payment.
- **Integration layer:** PayOS SDK và việc verify provider response nằm dưới `src/shared/integrations/payment`; không đưa PayOS vào domain.

## 11. Các lựa chọn nghiệp vụ đang được implement

Các quy tắc được chọn cho phiên bản này:

1. Bật nạp ví và thanh toán booking bằng ví; không hỗ trợ kết hợp ví + gateway trong một payment.
2. `frozen_balance` giữ tiền booking đến 72 giờ sau khi booking hoàn tất. Khách được tạo yêu cầu refund trong cửa sổ này; khi hết hạn chỉ giải ngân phần không gắn với yêu cầu đang mở. Yêu cầu đã gửi tiếp tục được giữ đến khi admin duyệt hoặc từ chối.
3. Provider thu tiền chọn qua `PAYMENT_PROVIDER`; payout ra ngân hàng do admin thực hiện và đối soát thủ công.
4. Hủy booking tạo refund request chờ admin; không tự chuyển tiền. Customer request cũng chờ duyệt và chỉ được duyệt sau khi booking kết thúc.
5. Chưa tính commission/thuế/phí nền tảng hoặc tự tính tỷ lệ refund theo thời điểm hủy.
6. Refund từ wallet được ghi có vào ví customer; refund ngoài hệ thống chỉ hoàn tất sau khi admin cung cấp payout reference.
7. Refund hoàn tất mới trừ khỏi `paidAmounts`; booking chưa kết thúc không thể được duyệt refund customer để tránh thiếu tiền giữa luồng. Yêu cầu refund customer trên booking `completed` chỉ được tạo trước thời điểm giải ngân dự kiến (72 giờ sau khi hoàn tất).
8. Webhook thất bại giữ `pending`; không tự đánh dấu `failed`.

## 12. Tham chiếu repo

- [`MODULES_BREAKDOWN.md`](./MODULES_BREAKDOWN.md) — ownership context, CQRS flow và consumer ports.
- [`wallet.entity.ts`](../src/shared/database/entities/wallet.entity.ts)
- [`transaction.entity.ts`](../src/shared/database/entities/transaction.entity.ts)
- [`payment-webhook.entity.ts`](../src/shared/database/entities/payment-webhook.entity.ts)
- [`payment.use-case.ts`](../src/modules/payment/payment.use-case.ts)
- [`payment.command.ts`](../src/modules/payment/payment.command.ts)
- [`wallet/wallet.use-case.ts`](../src/modules/payment/wallet/wallet.use-case.ts)
- [`refund/refund.use-case.ts`](../src/modules/payment/refund/refund.use-case.ts)
- [`transaction/transaction.use-case.ts`](../src/modules/payment/transaction/transaction.use-case.ts)
- [`payment.port.ts`](../src/shared/integrations/payment/payment.port.ts)
- [`migrations/001_lens.sql`](../migrations/001_lens.sql)

## 13. Phần đã implement trong payment module

Luồng hiện tại được chia theo payment, wallet, refund và transaction subdomain, nối vào API CQRS và lifecycle của Booking:

1. **Thu tiền:** payment booking có thể chọn `gateway` hoặc `wallet`; gateway lấy từ `PAYMENT_PROVIDER` (`payos` mặc định hoặc `sepay`). SePay tạo VietQR theo nội dung chứa mã đơn Lens và chỉ ghi nhận tiền sau webhook hợp lệ.
2. **Nạp ví:** tạo payment intent loại `wallet_topup`; webhook hợp lệ mới cộng số dư khả dụng và ghi một dòng ledger.
3. **Escrow booking:** giao dịch booking đã thanh toán được đưa vào `frozen_balance` của photographer. Khi booking hoàn tất, Payment lên lịch giải ngân sau 72 giờ; lúc đến hạn, giải ngân phần không bị refund đang chờ/đã duyệt giữ lại.
4. **Refund khi hủy:** booking chuyển sang `cancelled`, `rejected` hoặc `expired` sẽ tạo yêu cầu refund cho từng khoản booking đã thu; admin duyệt hoặc từ chối. Tiền không tự động chuyển ngân hàng.
5. **Customer request:** customer có thể yêu cầu hoàn một phần hoặc toàn bộ giao dịch booking đã paid; request không làm giảm số tiền Booking ghi nhận đã thu cho đến khi hoàn tất. Yêu cầu refund customer trên booking `completed` phải được gửi trong 72 giờ; admin chỉ duyệt khi booking đã kết thúc. Yêu cầu đang mở giữ lại phần escrow tương ứng kể cả khi cửa sổ 72 giờ đã hết.
6. **Rút ví:** tạo request sẽ chuyển tiền từ số dư khả dụng sang frozen để giữ chỗ. Admin từ chối thì tiền được trả về khả dụng; admin hoàn tất sau khi chuyển khoản thì ghi transaction withdrawal.
7. **Hoàn tất refund:** refund từ thanh toán wallet được ghi có vào ví customer. Với payment gateway, admin cần thực hiện chuyển khoản/refund bên ngoài hệ thống rồi gửi `payout_reference` để đánh dấu hoàn tất. `paidAmounts()` trừ các refund đã hoàn tất, tránh Booking tiếp tục coi tiền đã hoàn là tiền đã thu.
8. **Audit/idempotency:** `wallet_ledger` ghi biến động available/frozen; thao tác ví, webhook, refund và payout dùng khóa idempotency. Migration `018_payment_wallet_refunds.sql` mở rộng schema và giữ số dư ví cũ thành dòng opening ledger; `019_payment_escrow_hold.sql` theo dõi mốc giải ngân escrow sau 72 giờ; `020_payment_timeouts_and_extensions.sql` thêm deadline checkout/SLA và audit gia hạn.

### Worker và deadline của Payment

- **Checkout:** worker chạy mỗi 5 phút. Nạp ví hết hạn sau 24 giờ; payment cọc dùng hạn trả cọc hiện có (24 giờ sau khi booking được chấp nhận hoặc trước giờ chụp, lấy mốc sớm hơn). Worker hỏi PayOS và hủy order còn pending trước khi đánh dấu checkout hết hạn. Với SePay, QR chuyển khoản ngân hàng không thể thu hồi/đối soát trạng thái chắc chắn qua API, nên worker giữ trạng thái tài chính `pending`, xóa link/QR khỏi phản hồi và đánh dấu cần admin đối soát. Webhook hợp lệ đến muộn vẫn được nhận.
- **Refund/rút ví:** mỗi request được cấp 24 giờ cho bước xử lý hiện tại; khi admin duyệt, SLA được tính lại 24 giờ để hoàn tất payout/refund. Worker chạy mỗi 15 phút, gửi nhắc admin khi quá hạn và escalation sau 72 giờ quá hạn. Worker chỉ phát sự kiện nhắc/escalate, không tự duyệt, từ chối hay chuyển tiền. Admin có thể gia hạn 1–168 giờ kèm lý do; mỗi lần được ghi audit.
- **Escrow:** worker hiện có vẫn giải ngân phần không bị request mở giữ lại sau 72 giờ kể từ khi booking hoàn tất. Admin có thể gia hạn ngày giải ngân 1–168 giờ kèm lý do; việc này không kéo dài cửa sổ 72 giờ để khách gửi refund request.

### API bổ sung

- `GET /wallet`, `GET /wallet/ledger`
- `POST /wallet/topups`, `POST /wallet/withdrawals`
- `GET /me/refund-requests`, `POST /payments/:id/refund-requests`
- `GET /admin/refund-requests`
- `POST /admin/refund-requests/:id/approve`, `/reject`, `/complete`
- `POST /admin/refund-requests/:id/extend-deadline`
- `POST /admin/bookings/:id/escrow/extend-release`
- `POST /payments/webhooks/:provider` nhận callback PayOS hoặc SePay.

### Giới hạn đã chọn

- Chuyển tiền payout/refund ra ngân hàng hiện được admin đối soát thủ công; module chưa gọi API payout của PayOS/SePay.
- Chưa có commission/phí nền tảng, thanh toán kết hợp wallet + gateway, hoặc chính sách tự tính tỷ lệ hoàn theo thời điểm hủy. Admin review số tiền request trước khi duyệt.
- Webhook thất bại không tự đổi transaction sang `failed`; worker chỉ đặt `failed` khi provider xác nhận order đã hết hạn/hủy/thất bại và chưa nhận tiền. Nếu không thể xác định trạng thái provider, transaction vẫn `pending` kèm cờ yêu cầu đối soát.
- Khóa `PAYOUT_DESTINATION_ENCRYPTION_KEY` cần giữ ổn định sau khi triển khai vì thông tin ngân hàng được mã hóa AES-256-GCM bằng khóa này.
