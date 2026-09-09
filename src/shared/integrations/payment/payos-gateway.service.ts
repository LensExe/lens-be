import { Injectable } from '@nestjs/common';
import { PayOS } from '@payos/node';
import { PaymentGateway } from '../../database/unit-of-work/unit-of-work.port';
import { DomainError, ensure } from '../../platform/exceptions/domain.error';

@Injectable()
export class PayOsGateway extends PaymentGateway {
  private client?: PayOS;
  private getClient() {
    // TODO: INSERT_PAYOS_CLIENT_ID, INSERT_PAYOS_API_KEY, INSERT_PAYOS_CHECKSUM_KEY.
    const clientId = process.env.PAYOS_CLIENT_ID,
      apiKey = process.env.PAYOS_API_KEY,
      checksumKey = process.env.PAYOS_CHECKSUM_KEY;
    if (!clientId || !apiKey || !checksumKey)
      throw new DomainError('unavailable', 'PayOS is not configured');
    return (this.client ??= new PayOS({ clientId, apiKey, checksumKey }));
  }
  async create(orderCode: number, amount: number) {
    const client = this.getClient(),
      returnUrl = process.env.PAYOS_RETURN_URL,
      cancelUrl = process.env.PAYOS_CANCEL_URL;
    if (!returnUrl || !cancelUrl)
      throw new DomainError(
        'unavailable',
        'PayOS return/cancel URLs are missing',
      );
    try {
      const link = await client.paymentRequests.create({
        orderCode,
        amount,
        description: `Lens ${orderCode}`.slice(0, 25),
        returnUrl,
        cancelUrl,
      });
      return { checkout_url: link.checkoutUrl, qr_code: link.qrCode };
    } catch {
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
          'PayOS payment creation failed; retry with the same idempotency key',
        );
      }
    }
  }
  async verify(body: unknown) {
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
