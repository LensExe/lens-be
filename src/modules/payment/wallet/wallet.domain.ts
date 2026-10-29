import { ensure } from '@shared/domain/domain.error';
import { Payment } from '../payment.domain';

const MIN_TOPUP = 1_000;
const MIN_WITHDRAWAL = 10_000;

/** Wallet balance and amount rules. */
export class Wallet {
  /**
   * Validate a wallet top-up amount.
   *
   * @param amount Requested top-up amount in VND.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the amount is invalid or below the wallet minimum.
   */
  static assertTopUpAmount(amount: number) {
    Payment.assertAmount(amount);
    ensure(amount >= MIN_TOPUP, `Wallet top-up minimum is ${MIN_TOPUP} VND`);
  }

  /**
   * Validate a wallet withdrawal amount.
   *
   * @param amount Requested withdrawal amount in VND.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the amount is invalid or below the withdrawal minimum.
   */
  static assertWithdrawalAmount(amount: number) {
    Payment.assertAmount(amount);
    ensure(
      amount >= MIN_WITHDRAWAL,
      `Withdrawal minimum is ${MIN_WITHDRAWAL} VND`,
    );
  }

  /**
   * Ensure the wallet has enough available balance for a debit.
   *
   * @param balance Available wallet balance.
   * @param amount Amount to debit.
   * @param message Conflict message to report when funds are insufficient.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the available balance is insufficient.
   */
  static assertAvailableBalance(
    balance: number,
    amount: number,
    message: string,
  ) {
    ensure(balance >= amount, message, 'conflict');
  }

  /**
   * Ensure the wallet has enough frozen balance for a settlement.
   *
   * @param balance Frozen wallet balance.
   * @param amount Amount to settle.
   * @param message Conflict message to report when reserved funds are insufficient.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when the frozen balance is insufficient.
   */
  static assertFrozenBalance(balance: number, amount: number, message: string) {
    ensure(balance >= amount, message, 'conflict');
  }

  /**
   * Ensure a ledger update does not produce a negative balance.
   *
   * @param available Updated available balance.
   * @param frozen Updated frozen balance.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when either updated balance is negative.
   */
  static assertNonNegativeBalances(available: number, frozen: number) {
    ensure(
      available >= 0 && frozen >= 0,
      'Wallet balance cannot be negative',
      'conflict',
    );
  }
}
