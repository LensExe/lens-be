import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { DomainError, ensure } from '../../platform/exceptions/domain.error';
import { ExternalPaymentProvider } from '@shared/domain/values/payment.values';
import type {
  PaymentProviderAdapter,
  PaymentWebhookHeaders,
} from './payment-provider.adapter';

type SePayWebhook = {
  id?: number | string;
  transferType?: string;
  transferAmount?: number | string;
  code?: string | null;
  content?: string | null;
  referenceCode?: string | null;
  accountNumber?: string | null;
};

/** SePay direct VietQR collection and bank-transaction webhook adapter. */
@Injectable()
export class SePayGateway implements PaymentProviderAdapter {
  readonly provider = ExternalPaymentProvider.SEPAY;

  constructor(private readonly config: ConfigService) {}

  /**
   * Create SePay payment details for the supplied order code and amount.
   *
   * @param orderCode Order code.
   * @param amount Transaction amount in the system’s currency.
   * @returns Result object containing the fields `checkout_url`, `qr_code`.
   */
  create(orderCode: number, amount: number) {
    const account = this.required(
      'sepay.accountNumber',
      'SEPAY_ACCOUNT_NUMBER',
    );
    const bank = this.required('sepay.bankCode', 'SEPAY_BANK_CODE');
    const holder = this.config.get<string>('sepay.accountName') ?? '';
    const params = new URLSearchParams({
      acc: account,
      bank,
      amount: String(amount),
      des: `LENS${orderCode}`,
      template: 'compact',
      showinfo: 'true',
      ...(holder ? { holder } : {}),
    });
    const qr = `https://vietqr.app/img?${params.toString()}`;
    return Promise.resolve({ checkout_url: null, qr_code: qr });
  }

  /**
   * Validate the payment callback and normalize the provider result.
   *
   * @param body Request body validated against the DTO.
   * @param headers HTTP headers from the request.
   * @returns Result object containing the fields `reference`, `orderCode`, `amount`, `success`.
   * @throws {DomainError} Thrown when required data or a resource is missing, input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  verify(body: unknown, headers: PaymentWebhookHeaders = {}) {
    const secret = this.required(
      'sepay.webhookApiKey',
      'SEPAY_WEBHOOK_API_KEY',
    );
    const supplied = this.header(headers, 'authorization');
    ensure(
      this.safeEqual(supplied, `Apikey ${secret}`),
      'Invalid SePay webhook authorization',
      'invalid',
    );
    ensure(body && typeof body === 'object', 'Invalid SePay webhook payload');
    const payload = body as SePayWebhook;
    ensure(
      payload.transferType?.toLowerCase() === 'in',
      'SePay webhook is not an incoming transfer',
    );
    ensure(
      payload.accountNumber ===
        this.required('sepay.accountNumber', 'SEPAY_ACCOUNT_NUMBER'),
      'SePay webhook account does not match configured account',
      'conflict',
    );
    const amount = Number(payload.transferAmount);
    ensure(
      Number.isSafeInteger(amount) && amount > 0,
      'Invalid transfer amount',
    );
    const paymentCode = `${payload.code ?? ''} ${payload.content ?? ''}`;
    const orderMatch = paymentCode.match(/LENS(\d{4,})/i);
    ensure(
      orderMatch,
      'SePay transfer is missing a Lens payment code',
      'missing',
    );
    const reference = String(payload.referenceCode ?? payload.id ?? '');
    ensure(reference.length > 0, 'SePay transfer reference is missing');
    return Promise.resolve({
      reference,
      orderCode: Number(orderMatch[1]),
      amount,
      success: true,
    });
  }

  /**
   * Read a required configuration value and report an error if it is missing.
   *
   * @param name String value used by the operation: name.
   * @param envName String value used by the operation: env name.
   * @returns Processed value.
   */
  private required(name: string, envName: string) {
    const value = this.config.get<string>(name);
    if (!value)
      throw new DomainError('unavailable', `${envName} is not configured`);
    return value;
  }

  /**
   * Get an HTTP header value using a case-insensitive name match.
   *
   * @param headers HTTP headers from the request.
   * @param name String value used by the operation: name.
   * @returns Result of the operation described above.
   */
  private header(headers: PaymentWebhookHeaders, name: string) {
    const value = Object.entries(headers).find(
      ([headerName]) => headerName.toLowerCase() === name.toLowerCase(),
    )?.[1];
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  }

  /**
   * Compare two secret values in constant time to reduce timing-based information leaks.
   *
   * @param actual String value used by the operation: actual.
   * @param expected String value used by the operation: expected.
   * @returns Result of the operation described above.
   */
  private safeEqual(actual: string, expected: string) {
    const actualBytes = Buffer.from(actual);
    const expectedBytes = Buffer.from(expected);
    return (
      actualBytes.length === expectedBytes.length &&
      timingSafeEqual(actualBytes, expectedBytes)
    );
  }
}
