import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ensure } from '@shared/platform/exceptions/domain.error';
import {
  ExternalPaymentProvider,
  type ExternalPaymentProvider as ExternalPaymentProviderType,
} from '@shared/domain/values/payment.values';
import { PaymentGateway } from './port/payment.port';
import {
  PAYMENT_PROVIDER_ADAPTERS,
  type PaymentProviderAdapter,
  type PaymentProviderOrderState,
  type PaymentWebhookHeaders,
} from './payment-provider.adapter';

/** Selects the configured provider for new payments and routes callbacks by provider. */
@Injectable()
export class SwitchablePaymentGateway extends PaymentGateway {
  private readonly gateways: ReadonlyMap<
    ExternalPaymentProviderType,
    PaymentProviderAdapter
  >;

  constructor(
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER_ADAPTERS)
    providers: PaymentProviderAdapter[],
  ) {
    super();
    const gateways = new Map<
      ExternalPaymentProviderType,
      PaymentProviderAdapter
    >();

    for (const gateway of providers) {
      ensure(
        !gateways.has(gateway.provider),
        `Duplicate payment provider adapter: ${gateway.provider}`,
        'conflict',
      );
      gateways.set(gateway.provider, gateway);
    }
    this.gateways = gateways;
  }

  /**
   * Get the configured active payment provider key.
   *
   * @returns Processed configured value.
   * @throws {DomainError} Thrown when the service or resource is unavailable.
   */
  get activeProvider(): ExternalPaymentProviderType {
    const configured =
      this.config.get<string>('payment.provider') ??
      ExternalPaymentProvider.SEPAY;
    ensure(
      this.gateways.has(configured as ExternalPaymentProviderType),
      `Configured payment provider "${configured}" has no registered adapter`,
      'unavailable',
    );
    return configured as ExternalPaymentProviderType;
  }

  /**
   * Create a payment request through the currently selected provider.
   *
   * @param orderCode Order code.
   * @param amount Transaction amount in the system’s currency.
   * @param provider Selected service provider.
   * @returns Result returned by `create`.
   */
  create(
    orderCode: number,
    amount: number,
    provider: ExternalPaymentProviderType = this.activeProvider,
    expiresAt?: string,
    description?: string,
  ) {
    return this.gateway(provider).create(
      orderCode,
      amount,
      expiresAt,
      description,
    );
  }

  inspect(
    orderCode: number,
    provider: ExternalPaymentProviderType = this.activeProvider,
  ): Promise<PaymentProviderOrderState | null> {
    const gateway = this.gateway(provider);
    return gateway.inspect ? gateway.inspect(orderCode) : Promise.resolve(null);
  }

  cancel(
    orderCode: number,
    reason: string,
    provider: ExternalPaymentProviderType = this.activeProvider,
  ): Promise<PaymentProviderOrderState | null> {
    const gateway = this.gateway(provider);
    return gateway.cancel
      ? gateway.cancel(orderCode, reason)
      : Promise.resolve(null);
  }

  /**
   * Validate the payment callback and normalize the provider result.
   *
   * @param body Request body validated against the DTO.
   * @param provider Selected service provider.
   * @param headers HTTP headers from the request.
   * @returns Result returned by `verify`.
   */
  verify(
    body: unknown,
    provider: ExternalPaymentProviderType = this.activeProvider,
    headers: PaymentWebhookHeaders = {},
  ) {
    return this.gateway(provider).verify(body, headers);
  }

  /**
   * Get the payment gateway for the selected provider.
   *
   * @param provider Selected service provider.
   * @returns Processed gateway value.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  private gateway(provider: ExternalPaymentProviderType) {
    const gateway = this.gateways.get(provider);
    ensure(gateway, `Unsupported payment provider: ${provider}`, 'invalid');
    return gateway;
  }
}
