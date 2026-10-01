import type { ExternalPaymentProvider } from '@shared/domain/values/payment.values';
import type {
  PaymentCheckout,
  PaymentVerification,
  PaymentProviderOrderState,
  PaymentWebhookHeaders,
} from '@shared/integrations/payment/payment-provider.adapter';

/** Application-facing port; provider selection and routing stay in integrations. */
export abstract class PaymentGateway {
  /**
   * Get the configured active payment provider key.
   *
   * @returns Result of the operation described above.
   */
  abstract get activeProvider(): ExternalPaymentProvider;

  /**
   * Create a payment request through the specified provider.
   *
   * @param orderCode Order code.
   * @param amount Transaction amount in the system’s currency.
   * @param provider Selected service provider.
   * @returns Result of the operation described above.
   */
  abstract create(
    orderCode: number,
    amount: number,
    provider?: ExternalPaymentProvider,
    expiresAt?: string,
  ): Promise<PaymentCheckout>;

  /**
   * Inspect a provider order when that provider exposes order lookup.
   *
   * @param orderCode Provider order code.
   * @param provider Provider that owns the order.
   * @returns Current provider state, or `null` when inspection is unsupported.
   */
  abstract inspect(
    orderCode: number,
    provider?: ExternalPaymentProvider,
  ): Promise<PaymentProviderOrderState | null>;

  /**
   * Cancel a provider order when that provider supports cancellation.
   *
   * @param orderCode Provider order code.
   * @param reason Reason sent to the payment provider.
   * @param provider Provider that owns the order.
   * @returns Provider state after cancellation, or `null` when cancellation is unsupported.
   */
  abstract cancel(
    orderCode: number,
    reason: string,
    provider?: ExternalPaymentProvider,
  ): Promise<PaymentProviderOrderState | null>;

  /**
   * Validate the payment callback and normalize the provider result.
   *
   * @param body Request body validated against the DTO.
   * @param provider Selected service provider.
   * @param headers HTTP headers from the request.
   * @returns Result of the operation described above.
   */
  abstract verify(
    body: unknown,
    provider?: ExternalPaymentProvider,
    headers?: PaymentWebhookHeaders,
  ): Promise<PaymentVerification>;
}
