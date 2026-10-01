export interface PaymentAdminQueryInput {
  limit?: number;
  offset?: number;
  status?: string;
}

export interface PaymentDepositCommandInput {
  id: string;
  idempotency_key: string;
  payment_method?: 'gateway' | 'wallet';
}

export interface PaymentRemainingCommandInput {
  id: string;
  idempotency_key: string;
  payment_method?: 'gateway' | 'wallet';
}

export interface PaymentTopUpCommandInput {
  amount: number;
  idempotency_key: string;
}

export interface PaymentWithdrawalCommandInput {
  amount: number;
  reason: string;
  idempotency_key: string;
  payout_destination: {
    bank_code: string;
    account_number: string;
    account_name: string;
  };
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
  idempotency_key?: string;
}

export interface PaymentRefundReviewCommandInput {
  id: string;
  reason?: string;
  payout_destination?: {
    bank_code: string;
    account_number: string;
    account_name: string;
  };
}

export interface PaymentRefundCompleteCommandInput {
  id: string;
  payout_reference?: string;
}

export interface PaymentDeadlineExtensionInput {
  id: string;
  hours: number;
  reason: string;
}

export interface PaymentRefundsQueryInput {
  id: string;
}

export interface PaymentWebhookCommandInput {
  provider: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
}
