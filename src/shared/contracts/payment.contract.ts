export interface PaymentAdminQueryInput {
  limit?: number;
  offset?: number;
  status?: string;
}

export interface PaymentDepositCommandInput {
  id: string;
  idempotency_key: string;
}

export interface PaymentRemainingCommandInput {
  id: string;
  idempotency_key: string;
}

export interface PaymentGetQueryInput {
  id: string;
}

export interface PaymentQrQueryInput {
  id: string;
}

export interface PaymentHistoryQueryInput {
  id: string;
}

export interface PaymentRefundCommandInput {
  id: string;
  amount: number;
  reason: string;
}

export interface PaymentRefundsQueryInput {
  id: string;
}

export interface PaymentWebhookCommandInput {
  provider: string;
  payload: Record<string, unknown>;
}
