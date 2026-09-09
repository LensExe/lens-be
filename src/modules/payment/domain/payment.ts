import { ensure } from '@shared/platform/exceptions/domain.error';
import { money } from '@modules/booking/domain/booking';

export class Payment {
  constructor(
    readonly amount: number,
    readonly status: string,
  ) {
    money(amount);
  }
  acceptCallback(receivedAmount: number) {
    ensure(receivedAmount === this.amount, 'Callback amount does not match');
    return this.status === 'paid' ? 'duplicate' : 'paid';
  }
  requestRefund(amount: number, reserved: number) {
    money(amount);
    ensure(
      this.status === 'paid',
      'Only paid transactions may be refunded',
      'conflict',
    );
    ensure(
      reserved + amount <= this.amount,
      'Refund exceeds unrefunded amount',
      'conflict',
    );
  }
}
