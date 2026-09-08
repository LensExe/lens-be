import { Injectable } from '@nestjs/common';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';
import { TransactionDomainEntity } from '../../domain/entities/transaction.domain-entity';
import { TransactionOrmEntity } from '../entities/wallet.orm-entity';
import { TransactionMapper } from '../mappers/transaction.mapper';

@Injectable()
export class TransactionRepository implements ITransactionRepository {
  private readonly databaseTable: Map<string, TransactionOrmEntity> = new Map();

  findById(id: string): Promise<TransactionDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(TransactionMapper.toDomain(orm));
  }

  findByUserId(userId: string): Promise<TransactionDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values()).filter(
      (t) => t.userId === userId,
    );
    return Promise.resolve(orms.map((orm) => TransactionMapper.toDomain(orm)));
  }

  findByTransactionCode(code: string): Promise<TransactionDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (t) => t.transactionCode === code,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(TransactionMapper.toDomain(orm));
  }

  save(transaction: TransactionDomainEntity): Promise<TransactionDomainEntity> {
    const orm = TransactionMapper.toOrm(transaction);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(TransactionMapper.toDomain(orm));
  }
}
