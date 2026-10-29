import { ensure } from '@shared/domain/domain.error';
import { money } from '@shared/domain/rules/money.rules';

/** Refund rules for requests against a collected payment. */
export class Refund {
  constructor(
    readonly transactionAmount: number,
    readonly transactionStatus: string,
  ) {
    money(transactionAmount);
  }

  /**
   * Ensure a new refund request fits within the unreserved amount.
   *
   * @param amount Amount requested for refund.
   * @param reserved Amount already requested or approved for this transaction.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the source payment is unpaid or the request exceeds its refundable amount.
   */
  assertRequest(amount: number, reserved: number) {
    money(amount);
    ensure(
      this.transactionStatus === 'paid',
      'Only paid transactions may be refunded',
      'conflict',
    );
    ensure(
      reserved + amount <= this.transactionAmount,
      'Refund exceeds unrefunded amount',
      'conflict',
    );
  }
}
