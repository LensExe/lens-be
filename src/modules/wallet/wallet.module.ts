import { Module } from '@nestjs/common';
import { WalletService } from './application/services/wallet.service';
import { WALLET_REPOSITORY } from './domain/repositories/wallet.repository.interface';
import { WalletRepository } from './infrastructure/repositories/wallet.repository';
import { TRANSACTION_REPOSITORY } from './domain/repositories/transaction.repository.interface';
import { TransactionRepository } from './infrastructure/repositories/transaction.repository';

@Module({
  imports: [],
  providers: [
    WalletService,
    {
      provide: WALLET_REPOSITORY,
      useClass: WalletRepository,
    },
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: TransactionRepository,
    },
  ],
  exports: [WalletService],
})
export class WalletModule {}
