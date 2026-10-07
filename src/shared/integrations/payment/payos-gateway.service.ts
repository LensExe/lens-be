import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import type {
  PaymentProviderAdapter,
  PaymentWebhookHeaders,
} from './payment-provider.adapter';
import { DomainError, ensure } from '../../platform/exceptions/domain.error';
import { ExternalPaymentProvider } from '@shared/domain/values/payment.values';

@Injectable()
export class PayOsGateway implements PaymentProviderAdapter {
  readonly provider = ExternalPaymentProvider.PAYOS;
  private readonly logger = new Logger(PayOsGateway.name);

  constructor(private readonly config: ConfigService) {}

  private client?: PayOS;

  /**
   * Get the configured payment gateway client.
   *
   * @returns Result of the operation described above.
   */
  private getClient() {
    const clientId = this.config.get<string>('payos.clientId'),
      apiKey = this.config.get<string>('payos.apiKey'),
      checksumKey = this.config.get<string>('payos.checksumKey');
    if (!clientId || !apiKey || !checksumKey)
      throw new DomainError('unavailable', 'PayOS is not configured');
    return (this.client ??= new PayOS({ clientId, apiKey, checksumKey }));
  }

  /**
   * Create a PayOS payment link for the supplied order code and amount.
   *
   * @param orderCode Order code.
   * @param amount Transaction amount in the system’s currency.
   * @returns Result object containing the fields `checkout_url`, `qr_code`.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  async create(
    orderCode: number,
    amount: number,
    expiresAt?: string,
    description?: string,
  ) {
    const client = this.getClient(),
      returnUrl = this.config.get<string>('payos.returnUrl'),
      cancelUrl = this.config.get<string>('payos.cancelUrl');
    if (!returnUrl || !cancelUrl)
      throw new DomainError(
        'unavailable',
        'PayOS return/cancel URLs are missing',
      );

    // Create a PayOS payment link with the order details:
    try {
      const link = await client.paymentRequests.create({
        orderCode,
        amount,
        description: (description ?? `Lens ${orderCode}`).slice(0, 25),
        returnUrl,
        cancelUrl,
        ...(expiresAt
          ? { expiredAt: Math.floor(Date.parse(expiresAt) / 1000) }
          : {}),
      });
      return { checkout_url: link.checkoutUrl, qr_code: link.qrCode };
    } catch (error) {
      const providerError =
        error && typeof error === 'object'
          ? (error as {
              status?: unknown;
              code?: unknown;
              desc?: unknown;
            })
          : undefined;
      const status =
        typeof providerError?.status === 'number'
          ? providerError.status
          : 'unknown';
      const code =
        typeof providerError?.code === 'string'
          ? providerError.code
          : 'unknown';
      const description =
        typeof providerError?.desc === 'string'
          ? providerError.desc
          : 'No provider description';
      this.logger.error(
        `PayOS payment-link creation failed (status=${status}, code=${code}): ${description}`,
      );

      // Reconcile a retried create after an ambiguous network response.
      try {
        const existing = await client.paymentRequests.get(orderCode);
        ensure(
          existing.amount === amount,
          'Existing provider order amount mismatch',
          'conflict',
        );
        ensure(
          ['PENDING', 'PAID', 'PROCESSING'].includes(existing.status),
          'Provider order is no longer payable',
          'conflict',
        );
        // Official hosted checkout path. GET does not expose the original VietQR
        // string, so recovery returns null and the client opens hosted checkout.
        return {
          checkout_url: `https://pay.payos.vn/web/${encodeURIComponent(existing.id)}`,
          qr_code: null,
        };
      } catch {
        throw new DomainError(
          'unavailable',
          'PayOS payment creation failed and no existing payment link could be recovered',
        );
      }
    }
  }

  /**
   * Retrieve and normalize the latest state of a PayOS payment link.
   *
   * @param orderCode PayOS order code.
   * @returns Normalized provider state, received amount, and latest payment reference.
   * @throws {DomainError} Thrown when PayOS cannot return the order state.
   */
  async inspect(orderCode: number) {
    try {
      const link = await this.getClient().paymentRequests.get(orderCode);
      const statusByProviderValue = {
        PENDING: 'pending',
        PAID: 'paid',
        UNDERPAID: 'underpaid',
        PROCESSING: 'processing',
        EXPIRED: 'expired',
        CANCELLED: 'cancelled',
        FAILED: 'failed',
      } as const;
      const status = statusByProviderValue[link.status];
      ensure(
        status,
        'PayOS returned an unsupported payment status',
        'unavailable',
      );
      return {
        status,
        amount_paid: link.amountPaid,
        reference:
          link.transactions.length > 0
            ? link.transactions[link.transactions.length - 1].reference
            : null,
      };
    } catch {
      throw new DomainError(
        'unavailable',
        'Could not retrieve payment status from PayOS',
      );
    }
  }

  /**
   * Cancel a PayOS link and return its normalized provider state.
   *
   * @param orderCode PayOS order code.
   * @param reason Reason recorded by PayOS for the cancellation.
   * @returns Normalized provider state, received amount, and latest payment reference.
   * @throws {DomainError} Thrown when PayOS cannot cancel the order.
   */
  async cancel(orderCode: number, reason: string) {
    try {
      const link = await this.getClient().paymentRequests.cancel(
        orderCode,
        reason,
      );
      const statusByProviderValue = {
        PENDING: 'pending',
        PAID: 'paid',
        UNDERPAID: 'underpaid',
        PROCESSING: 'processing',
        EXPIRED: 'expired',
        CANCELLED: 'cancelled',
        FAILED: 'failed',
      } as const;
      const status = statusByProviderValue[link.status];
      ensure(
        status,
        'PayOS returned an unsupported payment status',
        'unavailable',
      );
      return {
        status,
        amount_paid: link.amountPaid,
        reference:
          link.transactions.length > 0
            ? link.transactions[link.transactions.length - 1].reference
            : null,
      };
    } catch {
      throw new DomainError('unavailable', 'Could not cancel the PayOS link');
    }
  }

  /**
   * Validate the payment callback and normalize the provider result.
   *
   * @param body Request body validated against the DTO.
   * @param _headers HTTP headers to validate.
   * @returns Result object containing the fields `reference`, `orderCode`, `amount`, `success`.
   */
  async verify(body: unknown, _headers?: PaymentWebhookHeaders) {
    const client = this.getClient();
    try {
      const data = await client.webhooks.verify(
        body as Parameters<typeof client.webhooks.verify>[0],
      );
      return {
        reference: data.reference,
        orderCode: data.orderCode,
        amount: data.amount,
        success: data.code === '00',
      };
    } catch {
      throw new DomainError('invalid', 'Invalid PayOS webhook signature');
    }
  }
}
