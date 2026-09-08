import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { WALLET_REPOSITORY } from '../../domain/repositories/wallet.repository.interface';
import type { IWalletRepository } from '../../domain/repositories/wallet.repository.interface';

@Injectable()
export class WalletService {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ) {}

  async findByUserId(userId: string) {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException(`Wallet for user "${userId}" not found.`);
    }
    return wallet;
  }

  async deposit(userId: string, amount: number) {
    const wallet = await this.findByUserId(userId);
    wallet.deposit(amount);
    return this.walletRepository.save(wallet);
  }

  async withdraw(userId: string, amount: number) {
    const wallet = await this.findByUserId(userId);
    wallet.withdraw(amount);
    return this.walletRepository.save(wallet);
  }

  async freeze(userId: string, amount: number) {
    const wallet = await this.findByUserId(userId);
    wallet.freeze(amount);
    return this.walletRepository.save(wallet);
  }

  async unfreeze(userId: string, amount: number) {
    const wallet = await this.findByUserId(userId);
    wallet.unfreeze(amount);
    return this.walletRepository.save(wallet);
  }
}
