import { TransactionDomainEntity } from '../../domain/entities/transaction.domain-entity';
import { TransactionOrmEntity } from '../entities/wallet.orm-entity';

export class TransactionMapper {
  static toDomain(orm: TransactionOrmEntity): TransactionDomainEntity {
    return new TransactionDomainEntity({
      id: orm.id,
      userId: orm.userId,
      transactionCode: orm.transactionCode,
      type: orm.type,
      referenceId: orm.referenceId,
      direction: orm.direction,
      amount: orm.amount,
      currency: orm.currency,
      status: orm.status,
      paymentGateway: orm.paymentGateway,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: TransactionDomainEntity): TransactionOrmEntity {
    const orm = new TransactionOrmEntity();
    orm.id = domain.id;
    orm.userId = domain.userId;
    orm.transactionCode = domain.transactionCode;
    orm.type = domain.type;
    orm.referenceId = domain.referenceId;
    orm.direction = domain.direction;
    orm.amount = domain.amount;
    orm.currency = domain.currency;
    orm.status = domain.status;
    orm.paymentGateway = domain.paymentGateway;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
