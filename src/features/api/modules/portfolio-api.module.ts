import { Module } from '@nestjs/common';
import { PortfolioController } from '../http/portfolio.controller';
import {
  PortfolioAddCommandHandler,
  PortfolioCreateCommandHandler,
  PortfolioRemoveCommandHandler,
  PortfolioRemoveItemCommandHandler,
  PortfolioReorderCommandHandler,
  PortfolioUpdateCommandHandler,
} from '@modules/photographer/portfolio/portfolios.command';
import {
  PortfolioGetQueryHandler,
  PortfolioListQueryHandler,
} from '@modules/photographer/portfolio/portfolios.query';

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
