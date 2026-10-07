import type { ExternalPaymentProvider } from '@shared/domain/values/payment.values';

export const PAYMENT_PROVIDER_ADAPTERS = Symbol('PAYMENT_PROVIDER_ADAPTERS');

export type PaymentWebhookHeaders = Record<
  string,
  string | string[] | undefined
>;

export interface PaymentCheckout {
  checkout_url: string | null;
  qr_code: string | null;
}

export interface PaymentVerification {
  reference: string;
  orderCode: number;
  amount: number;
  success: boolean;
}

export interface PaymentProviderOrderState {
  status:
    | 'pending'
    | 'paid'
    | 'underpaid'
    | 'processing'
    | 'expired'
    | 'cancelled'
    | 'failed';
  amount_paid: number;
  reference: string | null;
}

/** Shared contract implemented by each external payment provider adapter. */
export interface PaymentProviderAdapter {
  readonly provider: ExternalPaymentProvider;

  create(
    orderCode: number,
    amount: number,
    expiresAt?: string,
    description?: string,
  ): Promise<PaymentCheckout>;

  inspect?(orderCode: number): Promise<PaymentProviderOrderState>;

  cancel?(
    orderCode: number,
    reason: string,
  ): Promise<PaymentProviderOrderState>;

  verify(
    body: unknown,
    headers?: PaymentWebhookHeaders,
  ): Promise<PaymentVerification>;
}
