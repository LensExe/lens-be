import { TransactionDomainEntity } from '../entities/transaction.domain-entity';

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');

export interface ITransactionRepository {
  findById(id: string): Promise<TransactionDomainEntity | null>;
  findByUserId(userId: string): Promise<TransactionDomainEntity[]>;
  findByTransactionCode(code: string): Promise<TransactionDomainEntity | null>;
  save(transaction: TransactionDomainEntity): Promise<TransactionDomainEntity>;
}
