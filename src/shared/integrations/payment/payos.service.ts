import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS, type Webhook } from '@payos/node';
import {
  CreatePaymentOptions,
  IPaymentGateway,
  PaymentVerifyResult,
} from './payment.interface';

/**
 * Service tích hợp cổng thanh toán PayOS (VietQR tự động)
 */
@Injectable()
export class PayOSService implements IPaymentGateway {
  private readonly logger = new Logger(PayOSService.name);
  private readonly payOS: PayOS;

  constructor(private readonly configService: ConfigService) {
    const payos = this.configService.get('payos') ?? {};
    const clientId =
      payos.clientId ?? process.env.PAYOS_CLIENT_ID ?? 'DEMO_CLIENT_ID';
    const apiKey = payos.apiKey ?? process.env.PAYOS_API_KEY ?? 'DEMO_API_KEY';
    const checksumKey =
      payos.checksumKey ??
      process.env.PAYOS_CHECKSUM_KEY ??
      'DEMO_CHECKSUM_KEY';

    this.payOS = new PayOS({
      clientId,
      apiKey,
      checksumKey,
    });
    this.logger.log('Initialized PayOS Payment Gateway');
  }

  /**
   * Tạo link thanh toán PayOS (trả về checkoutUrl)
   */
  async createPaymentUrl(options: CreatePaymentOptions): Promise<string> {
    // PayOS yêu cầu orderCode dạng số nguyên dương (number <= 9007199254740991)
    const orderCode =
      options.orderCode ??
      Number.parseInt(
        options.orderId?.replace(/\D/g, '') || `${Date.now()}`.slice(-9),
        10,
      );

    // PayOS quy định description tối đa 25 ký tự
    const description = options.description.slice(0, 25);

    const paymentLink = await this.payOS.paymentRequests.create({
      orderCode,
      amount: options.amount,
      description,
      returnUrl: options.returnUrl,
      cancelUrl: options.cancelUrl ?? options.returnUrl,
      items: options.items,
    });

    this.logger.log(
      `Created PayOS payment link for order #${orderCode}: ${paymentLink.checkoutUrl}`,
    );
    return paymentLink.checkoutUrl;
  }

  /**
   * Xác thực dữ liệu Webhook nhận được từ PayOS khi khách hàng quét mã VietQR thành công
   */
  async verifyWebhook(webhookBody: Webhook): Promise<PaymentVerifyResult> {
    try {
      const verifiedData = await this.payOS.webhooks.verify(webhookBody);
      return {
        isSuccess: true,
        orderCode: verifiedData.orderCode,
        transactionId: verifiedData.reference,
        amount: verifiedData.amount,
        message: 'Thanh toán PayOS thành công',
        data: verifiedData,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Chữ ký Webhook PayOS không hợp lệ';
      this.logger.error(`PayOS webhook verification failed: ${message}`);
      return {
        isSuccess: false,
        orderCode: webhookBody.data.orderCode,
        message,
      };
    }
  }

  /**
   * Tra cứu thông tin trạng thái đơn hàng từ PayOS
   */
  async getPaymentInformation(orderCode: number): Promise<any> {
    return this.payOS.paymentRequests.get(orderCode);
  }

  /**
   * Hủy link thanh toán
   */
  async cancelPaymentLink(orderCode: number, reason?: string): Promise<any> {
    return this.payOS.paymentRequests.cancel(orderCode, reason);
  }
}
