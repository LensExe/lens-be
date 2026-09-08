import { WalletDomainEntity } from '../entities/wallet.domain-entity';

export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY');

export interface IWalletRepository {
  findById(id: string): Promise<WalletDomainEntity | null>;
  findByUserId(userId: string): Promise<WalletDomainEntity | null>;
  save(wallet: WalletDomainEntity): Promise<WalletDomainEntity>;
}
