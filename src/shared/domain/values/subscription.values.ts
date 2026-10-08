/** Membership or subscription status. */
export const SubscriptionStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

/** Events recorded on a photographer subscription timeline. */
export const SubscriptionHistoryEvent = {
  CREATED: 'created',
  RENEWAL_CANCELLED: 'renewal_cancelled',
  PAYMENT_ACTIVATED: 'payment_activated',
  PAYMENT_TIMEOUT: 'payment_timeout',
  PAYMENT_LATE_REVIEW: 'payment_late_review',
  PAYMENT_RECONCILED: 'payment_reconciled',
  PAYMENT_REFUNDED: 'payment_refunded',
  EXPIRED: 'expired',
  IMPORTED: 'imported',
} as const;

export type SubscriptionHistoryEvent =
  (typeof SubscriptionHistoryEvent)[keyof typeof SubscriptionHistoryEvent];

/** Actors allowed to write subscription history. */
export type SubscriptionHistoryActorRole = 'user' | 'admin' | 'system';
