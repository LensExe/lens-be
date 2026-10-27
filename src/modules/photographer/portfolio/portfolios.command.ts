import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource, type EntityManager } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { PortfolioUseCases } from './portfolio.use-case';
import { PublicPortfolioMetadataCache } from './public-portfolio-metadata.cache';
import { PublicPhotographersQueryCache } from '../public-photographers-query.cache';

async function executePortfolioMutation<T>(
  dataSource: DataSource,
  portfolioCache: PublicPortfolioMetadataCache,
  photographersCache: PublicPhotographersQueryCache,
  operation: (s: EntityManager) => Promise<T>,
): Promise<T> {
  const result = await dataSource.transaction(operation);
  await Promise.all([
    portfolioCache.invalidateAll(),
    photographersCache.invalidateAll(),
  ]);
  return result;
}

export class PortfolioCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PortfolioCreateCommandInput,
  ) {}
}
@CommandHandler(PortfolioCreateCommand)
export class PortfolioCreateCommandHandler implements ICommandHandler<PortfolioCreateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PortfolioUseCases,
    private readonly portfolioCache: PublicPortfolioMetadataCache,
    private readonly photographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the portfolio creation command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PortfolioCreateCommand) {
    return executePortfolioMutation(
      this.dataSource,
      this.portfolioCache,
      this.photographersCache,
      (s) => this.useCases.create(s, message.actor, message.input),
    );
  }
}

export class PortfolioReorderCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PortfolioReorderCommandInput,
  ) {}
}
@CommandHandler(PortfolioReorderCommand)
export class PortfolioReorderCommandHandler implements ICommandHandler<PortfolioReorderCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PortfolioUseCases,
    private readonly portfolioCache: PublicPortfolioMetadataCache,
    private readonly photographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the portfolio reorder command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PortfolioReorderCommand) {
    return executePortfolioMutation(
      this.dataSource,
      this.portfolioCache,
      this.photographersCache,
      (s) => this.useCases.reorder(s, message.actor, message.input),
    );
  }
}

export class PortfolioAddCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PortfolioAddCommandInput,
  ) {}
}
@CommandHandler(PortfolioAddCommand)
export class PortfolioAddCommandHandler implements ICommandHandler<PortfolioAddCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PortfolioUseCases,
    private readonly portfolioCache: PublicPortfolioMetadataCache,
    private readonly photographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the portfolio item addition command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PortfolioAddCommand) {
    return executePortfolioMutation(
      this.dataSource,
      this.portfolioCache,
      this.photographersCache,
      (s) => this.useCases.add(s, message.actor, message.input),
    );
  }
}

export class PortfolioUpdateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PortfolioUpdateCommandInput,
  ) {}
}
@CommandHandler(PortfolioUpdateCommand)
export class PortfolioUpdateCommandHandler implements ICommandHandler<PortfolioUpdateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PortfolioUseCases,
    private readonly portfolioCache: PublicPortfolioMetadataCache,
    private readonly photographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the portfolio update command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PortfolioUpdateCommand) {
    return executePortfolioMutation(
      this.dataSource,
      this.portfolioCache,
      this.photographersCache,
      (s) => this.useCases.update(s, message.actor, message.input),
    );
  }
}

export class PortfolioRemoveCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PortfolioRemoveCommandInput,
  ) {}
}
@CommandHandler(PortfolioRemoveCommand)
export class PortfolioRemoveCommandHandler implements ICommandHandler<PortfolioRemoveCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PortfolioUseCases,
    private readonly portfolioCache: PublicPortfolioMetadataCache,
    private readonly photographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the portfolio deletion command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PortfolioRemoveCommand) {
    return executePortfolioMutation(
      this.dataSource,
      this.portfolioCache,
      this.photographersCache,
      (s) => this.useCases.remove(s, message.actor, message.input),
    );
  }
}

export class PortfolioRemoveItemCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PortfolioRemoveItemCommandInput,
  ) {}
}
@CommandHandler(PortfolioRemoveItemCommand)
export class PortfolioRemoveItemCommandHandler implements ICommandHandler<PortfolioRemoveItemCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PortfolioUseCases,
    private readonly portfolioCache: PublicPortfolioMetadataCache,
    private readonly photographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the portfolio item deletion command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PortfolioRemoveItemCommand) {
    return executePortfolioMutation(
      this.dataSource,
      this.portfolioCache,
      this.photographersCache,
      (s) => this.useCases.removeItem(s, message.actor, message.input),
    );
  }
}
