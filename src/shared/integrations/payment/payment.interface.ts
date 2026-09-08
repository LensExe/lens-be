export interface CreatePaymentOptions {
  orderCode?: number; // Mã đơn dạng số nguyên duy nhất (PayOS bắt buộc)
  orderId?: string; // Mã đơn dạng chuỗi (fallback)
  amount: number; // Số tiền (VND)
  description: string; // Mô tả đơn hàng (PayOS quy định tối đa 25 ký tự)
  returnUrl: string; // URL khi thanh toán thành công
  cancelUrl?: string; // URL khi người dùng bấm huỷ
  items?: Array<{ name: string; quantity: number; price: number }>;
}

export interface PaymentVerifyResult {
  isSuccess: boolean;
  orderCode: number | string;
  transactionId?: string;
  amount?: number;
  message?: string;
  data?: any;
}

export interface IPaymentGateway {
  /**
   * Tạo link thanh toán (checkout URL)
   */
  createPaymentUrl(options: CreatePaymentOptions): Promise<string>;

  /**
   * Xác thực dữ liệu Webhook từ cổng thanh toán
   */
  verifyWebhook(webhookBody: any): Promise<PaymentVerifyResult>;

  /**
   * Tra cứu trạng thái đơn hàng
   */
  getPaymentInformation(orderCode: number): Promise<any>;
}

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';
