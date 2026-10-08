import type { TransactionEntity } from '@shared/database/entities/transaction.entity';

/** Accounting projections for payment transactions. */
export class PaymentTransaction {
  /**
   * Calculate paid booking totals after subtracting completed refunds.
   *
   * @param bookingIds Booking IDs to include in the result.
   * @param transactions Paid deposit and remaining transactions.
   * @param refunds Completed refund requests for those transactions.
   * @returns Net paid amount keyed by booking ID.
   */
  static paidAmounts(
    bookingIds: readonly string[],
    transactions: readonly TransactionEntity[],
    refunds: readonly { transaction_id: string; amount: number }[],
  ) {
    const paid: Record<string, number> = Object.fromEntries(
      bookingIds.map((id) => [id, 0]),
    );
    const refundedByTransaction = new Map<string, number>();
    for (const refund of refunds)
      if (refund.transaction_id)
        refundedByTransaction.set(
          refund.transaction_id,
          (refundedByTransaction.get(refund.transaction_id) ?? 0) +
            Number(refund.amount),
        );
    for (const transaction of transactions) {
      if (!transaction.reference_id) continue;
      paid[transaction.reference_id] += Math.max(
        0,
        Number(transaction.amount) -
          (refundedByTransaction.get(transaction.id) ?? 0),
      );
    }
    return paid;
  }
}
