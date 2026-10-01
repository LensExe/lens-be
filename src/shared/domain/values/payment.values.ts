/** Transaction types in the system. */
export const TransactionType = {
  DEPOSIT: 'deposit',
  REMAINING: 'remaining',
  SUBSCRIPTION: 'subscription',
  WALLET_TOPUP: 'wallet_topup',
  REFUND: 'refund',
  WITHDRAWAL: 'withdrawal',
} as const;

export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionDirection = {
  IN: 'in',
  OUT: 'out',
} as const;

export type TransactionDirection =
  (typeof TransactionDirection)[keyof typeof TransactionDirection];

export const TransactionStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
} as const;

export type TransactionStatus =
  (typeof TransactionStatus)[keyof typeof TransactionStatus];

export const TransactionPaymentGateway = {
  PAYOS: 'payos',
  SEPAY: 'sepay',
  WALLET_INTERNAL: 'wallet_internal',
  BANK_TRANSFER: 'bank_transfer',
} as const;

export type TransactionPaymentGateway =
  (typeof TransactionPaymentGateway)[keyof typeof TransactionPaymentGateway];

export const RefundStatus = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
} as const;

export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const RefundRequestType = {
  BOOKING_CANCELLATION: 'booking_cancellation',
  CUSTOMER_REQUEST: 'customer_request',
  WALLET_WITHDRAWAL: 'wallet_withdrawal',
} as const;

export type RefundRequestType =
  (typeof RefundRequestType)[keyof typeof RefundRequestType];

export const ExternalPaymentProvider = {
  PAYOS: 'payos',
  SEPAY: 'sepay',
} as const;

export type ExternalPaymentProvider =
  (typeof ExternalPaymentProvider)[keyof typeof ExternalPaymentProvider];
