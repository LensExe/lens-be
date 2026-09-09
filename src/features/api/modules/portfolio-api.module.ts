import { Module } from '@nestjs/common';
import { PortfolioController } from '../http/portfolio.controller';
import {
  PortfolioAddCommandHandler,
  PortfolioCreateCommandHandler,
  PortfolioRemoveCommandHandler,
  PortfolioRemoveItemCommandHandler,
  PortfolioReorderCommandHandler,
  PortfolioUpdateCommandHandler,
} from '@modules/photographer/application/commands/portfolios';
import {
  PortfolioGetQueryHandler,
  PortfolioListQueryHandler,
} from '@modules/photographer/application/queries/portfolios';

@Module({
  controllers: [PortfolioController],
  providers: [
    PortfolioAddCommandHandler,
    PortfolioCreateCommandHandler,
    PortfolioRemoveCommandHandler,
    PortfolioRemoveItemCommandHandler,
    PortfolioReorderCommandHandler,
    PortfolioUpdateCommandHandler,
    PortfolioGetQueryHandler,
    PortfolioListQueryHandler,
  ],
})
export class PortfolioApiModule {}
