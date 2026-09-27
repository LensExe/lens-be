import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { PortfolioUseCases } from './portfolio.use-case';

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
  ) {}
  execute(message: PortfolioCreateCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.create(s, message.actor, message.input),
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
  ) {}
  execute(message: PortfolioReorderCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.reorder(s, message.actor, message.input),
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
  ) {}
  execute(message: PortfolioAddCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.add(s, message.actor, message.input),
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
  ) {}
  execute(message: PortfolioUpdateCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.update(s, message.actor, message.input),
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
  ) {}
  execute(message: PortfolioRemoveCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.remove(s, message.actor, message.input),
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
  ) {}
  execute(message: PortfolioRemoveItemCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.removeItem(s, message.actor, message.input),
    );
  }
}
