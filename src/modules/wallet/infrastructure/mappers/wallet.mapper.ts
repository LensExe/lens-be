import { WalletDomainEntity } from '../../domain/entities/wallet.domain-entity';
import { WalletOrmEntity } from '../entities/wallet.orm-entity';

export class WalletMapper {
  static toDomain(orm: WalletOrmEntity): WalletDomainEntity {
    return new WalletDomainEntity({
      id: orm.id,
      userId: orm.userId,
      balance: orm.balance,
      frozenBalance: orm.frozenBalance,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: WalletDomainEntity): WalletOrmEntity {
    const orm = new WalletOrmEntity();
    orm.id = domain.id;
    orm.userId = domain.userId;
    orm.balance = domain.balance;
    orm.frozenBalance = domain.frozenBalance;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
