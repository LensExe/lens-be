import { Injectable } from '@nestjs/common';
import type { IWalletRepository } from '../../domain/repositories/wallet.repository.interface';
import { WalletDomainEntity } from '../../domain/entities/wallet.domain-entity';
import { WalletOrmEntity } from '../entities/wallet.orm-entity';
import { WalletMapper } from '../mappers/wallet.mapper';

@Injectable()
export class WalletRepository implements IWalletRepository {
  private readonly databaseTable: Map<string, WalletOrmEntity> = new Map();

  findById(id: string): Promise<WalletDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(WalletMapper.toDomain(orm));
  }

  findByUserId(userId: string): Promise<WalletDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (w) => w.userId === userId,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(WalletMapper.toDomain(orm));
  }

  save(wallet: WalletDomainEntity): Promise<WalletDomainEntity> {
    const orm = WalletMapper.toOrm(wallet);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(WalletMapper.toDomain(orm));
  }
}
