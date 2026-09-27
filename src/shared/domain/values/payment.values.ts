/** Các loại giao dịch trong hệ thống. */
export const TransactionType = {
  DEPOSIT: 'deposit',
  REMAINING: 'remaining',
  SUBSCRIPTION: 'subscription',
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
