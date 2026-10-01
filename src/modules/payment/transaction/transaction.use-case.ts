import { In, type EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { EntitySchemas } from '@shared/database';
import type { TransactionEntity } from '@shared/database/entities/transaction.entity';
import type * as Inputs from '@shared/contracts/contracts';
import type { Actor } from '@shared/platform/auth/actor';
import {
  bookingAccess,
  currentUser,
  pageWindow,
  paged,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { RefundStatus } from '@shared/domain/values/payment.values';
import type { PaidAmountsPort } from '@modules/booking/ports/paid-amounts.port';
import { PaymentTransaction } from './transaction.domain';

/** Read-side operations and accounting projections for payment transactions. */
@Injectable()
export class TransactionUseCases implements PaidAmountsPort {
  /**
   * Check whether the caller may access the requested transaction.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param id ID of the record to process.
   * @returns Processed transaction value.
   * @throws {DomainError} Thrown when required data or a resource is missing or the actor is not authorized.
   */
  async access(manager: EntityManager, actor: Actor, id: string) {
    const transaction = await manager.findOne(EntitySchemas.transactions, {
      where: { id },
    });
    ensure(transaction, 'Transaction not found', 'missing');
    const user = await currentUser(manager, actor);
    if (transaction.user_id !== user.id && !actor.roles.includes('admin')) {
      ensure(
        ['deposit', 'remaining'].includes(transaction.type) &&
          transaction.reference_id,
        'Payment access denied',
        'forbidden',
      );
      await bookingAccess(manager, actor, transaction.reference_id);
    }
    return transaction;
  }

  /**
   * Get payment transaction details by ID after checking access permissions.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `access`.
   */
  async get(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentGetQueryInput,
  ) {
    const transaction = await this.access(manager, actor, input.id);
    return this.presentTransaction(transaction);
  }

  /**
   * Create or retrieve the payment QR code for the specified transaction.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result object containing the fields `id`, `status`, `qr_code`, `checkout_url`.
   */
  async qr(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentQrQueryInput,
  ) {
    const transaction = await this.access(manager, actor, input.id);
    const presented = this.presentTransaction(transaction);
    return {
      id: transaction.id,
      status: transaction.status,
      qr_code: presented.qr_code,
      checkout_url: presented.checkout_url,
      checkout_expires_at: transaction.checkout_expires_at,
      checkout_expired: presented.checkout_expired,
      checkout_review_required_at: transaction.checkout_review_required_at,
    };
  }

  /**
   * Get transaction history for the specified subject after checking caller permissions.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result object containing the fields `items`.
   */
  async history(
    manager: EntityManager,
    actor: Actor,
    input: Inputs.PaymentHistoryQueryInput,
  ) {
    await bookingAccess(manager, actor, input.id);
    const settlement = await manager.findOneBy(
      EntitySchemas.payment_escrow_settlements,
      { booking_id: input.id },
    );
    return {
      items: (
        await manager.find(EntitySchemas.transactions, {
          where: { reference_id: input.id },
          order: { created_at: 'ASC', id: 'ASC' },
        })
      ).map((transaction) => this.presentTransaction(transaction)),
      escrow_release_at: settlement?.release_at ?? null,
      refund_request_deadline_at:
        settlement?.refund_request_deadline_at ?? null,
    };
  }

  /**
   * Remove expired checkout credentials while preserving their financial status for reconciliation.
   *
   * @param transaction Transaction to present to an API caller.
   * @returns Transaction with expired checkout credentials hidden and an expiration indicator.
   */
  private presentTransaction(transaction: TransactionEntity) {
    const checkoutExpired =
      transaction.checkout_expired_at !== null ||
      (transaction.checkout_expires_at !== null &&
        Date.parse(transaction.checkout_expires_at) <= Date.now());
    const checkoutUnavailable =
      transaction.status !== 'pending' || checkoutExpired;
    return {
      ...transaction,
      checkout_expired: checkoutExpired,
      checkout_url: checkoutUnavailable ? null : transaction.checkout_url,
      qr_code: checkoutUnavailable ? null : transaction.qr_code,
    };
  }

  /**
   * List records for the admin view using the supplied filters.
   *
   * @param manager EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param query Query filters and pagination options.
   * @returns Result returned by `paged`.
   */
  async admin(
    manager: EntityManager,
    actor: Actor,
    query: Inputs.PaymentAdminQueryInput,
  ) {
    role(actor, 'admin');
    await currentUser(manager, actor);
    const { limit, offset } = pageWindow(query);
    const builder = manager.createQueryBuilder(
      EntitySchemas.transactions,
      'transaction',
    );
    if (query.status)
      builder.andWhere('transaction.status = :status', {
        status: query.status,
      });
    const [items, total] = await builder
      .orderBy('transaction.created_at', 'DESC')
      .addOrderBy('transaction.id', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();
    return paged(items, total, query);
  }

  /**
   * Get the total amount paid for each requested booking.
   *
   * @param manager EntityManager for the current transaction.
   * @param bookingIds List of booking ids to process.
   * @returns Result of the operation described above.
   */
  async paidAmounts(manager: EntityManager, bookingIds: readonly string[]) {
    if (!bookingIds.length) return {};
    const transactions = await manager.findBy(EntitySchemas.transactions, {
      reference_id: In([...bookingIds]),
      status: 'paid',
      type: In(['deposit', 'remaining']),
    });
    if (!transactions.length)
      return PaymentTransaction.paidAmounts(bookingIds, [], []);
    const refunds = await manager.findBy(EntitySchemas.refund_requests, {
      transaction_id: In(transactions.map((transaction) => transaction.id)),
      status: RefundStatus.COMPLETED,
    });
    return PaymentTransaction.paidAmounts(bookingIds, transactions, refunds);
  }
}
