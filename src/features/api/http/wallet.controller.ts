import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WalletService } from '@modules/wallet/application/services/wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.walletService.findByUserId(userId);
  }

  @Post('user/:userId/deposit')
  deposit(@Param('userId') userId: string, @Body('amount') amount: number) {
    return this.walletService.deposit(userId, amount);
  }

  @Post('user/:userId/withdraw')
  withdraw(@Param('userId') userId: string, @Body('amount') amount: number) {
    return this.walletService.withdraw(userId, amount);
  }

  @Post('user/:userId/freeze')
  freeze(@Param('userId') userId: string, @Body('amount') amount: number) {
    return this.walletService.freeze(userId, amount);
  }

  @Post('user/:userId/unfreeze')
  unfreeze(@Param('userId') userId: string, @Body('amount') amount: number) {
    return this.walletService.unfreeze(userId, amount);
  }
}
