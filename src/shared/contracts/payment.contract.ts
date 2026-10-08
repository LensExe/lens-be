export interface PaymentAdminQueryInput {
  limit?: number;
  offset?: number;
  status?: string;
  review_required?: 'true' | 'false';
}

export interface PaymentDepositCommandInput {
  booking_id: string;
  idempotency_key: string;
  payment_method?: 'gateway' | 'wallet';
}

export interface PaymentRemainingCommandInput {
  booking_id: string;
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
  payment_id: string;
}

export interface PaymentQrQueryInput {
  payment_id: string;
}

export interface PaymentHistoryQueryInput {
  booking_id: string;
}

export interface PaymentRefundCommandInput {
  payment_id: string;
  amount: number;
  reason: string;
  idempotency_key?: string;
}

export interface PaymentCustomerRefundCommandInput {
  booking_id: string;
  amount: number;
  reason: string;
  idempotency_key?: string;
}

export interface PaymentRefundReviewCommandInput {
  refund_request_id: string;
  reason?: string;
  payout_destination?: {
    bank_code: string;
    account_number: string;
    account_name: string;
  };
}

export interface PaymentRefundCompleteCommandInput {
  refund_request_id: string;
  payout_reference?: string;
}

export interface PaymentDeadlineExtensionInput {
  refund_request_id: string;
  hours: number;
  reason: string;
}

export interface PaymentEscrowReleaseExtensionInput {
  booking_id: string;
  hours: number;
  reason: string;
}

export interface PaymentRefundsQueryInput {
  payment_id: string;
}

export interface PaymentWebhookCommandInput {
  provider: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
}
