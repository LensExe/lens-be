export abstract class PaymentGateway {
  abstract create(
    orderCode: number,
    amount: number,
  ): Promise<{ checkout_url: string; qr_code: string | null }>;
  abstract verify(body: unknown): Promise<{
    reference: string;
    orderCode: number;
    amount: number;
    success: boolean;
  }>;
}
