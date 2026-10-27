import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { PhotographerUseCases } from './photographer.use-case';
import { PhotographerAchievementsCache } from './photographer-achievements.cache';
import { PublicPhotographersQueryCache } from './public-photographers-query.cache';

export class PhotographerLocationCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerLocationCommandInput,
  ) {}
}
@CommandHandler(PhotographerLocationCommand)
export class PhotographerLocationCommandHandler implements ICommandHandler<PhotographerLocationCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
    private readonly publicPhotographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the photographer location update command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  async execute(message: PhotographerLocationCommand) {
    const result = await this.dataSource.transaction((s) =>
      this.useCases.location(s, message.actor, message.input),
    );
    await this.publicPhotographersCache.invalidateAll();
    return result;
  }
}

export class PhotographerStatusCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerStatusCommandInput,
  ) {}
}
@CommandHandler(PhotographerStatusCommand)
export class PhotographerStatusCommandHandler implements ICommandHandler<PhotographerStatusCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
    private readonly publicPhotographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the photographer status update command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  async execute(message: PhotographerStatusCommand) {
    const result = await this.dataSource.transaction((s) =>
      this.useCases.status(s, message.actor, message.input),
    );
    await this.publicPhotographersCache.invalidateAll();
    return result;
  }
}

export class PhotographerUpdateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerUpdateCommandInput,
  ) {}
}
@CommandHandler(PhotographerUpdateCommand)
export class PhotographerUpdateCommandHandler implements ICommandHandler<PhotographerUpdateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
    private readonly publicPhotographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the photographer update command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  async execute(message: PhotographerUpdateCommand) {
    const result = await this.dataSource.transaction((s) =>
      this.useCases.update(s, message.actor, message.input),
    );
    await this.publicPhotographersCache.invalidateAll();
    return result;
  }
}

export class PhotographerCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerCreateCommandInput,
  ) {}
}
@CommandHandler(PhotographerCreateCommand)
export class PhotographerCreateCommandHandler implements ICommandHandler<PhotographerCreateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
  ) {}

  /**
   * Route the photographer creation command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: PhotographerCreateCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.create(s, message.actor, message.input),
    );
  }
}

export class PhotographerApproveCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerApproveCommandInput,
  ) {}
}
@CommandHandler(PhotographerApproveCommand)
export class PhotographerApproveCommandHandler implements ICommandHandler<PhotographerApproveCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
    private readonly publicPhotographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the photographer approval command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  async execute(message: PhotographerApproveCommand) {
    const result = await this.dataSource.transaction((s) =>
      this.useCases.approve(s, message.actor, message.input),
    );
    await this.publicPhotographersCache.invalidateAll();
    return result;
  }
}

export class PhotographerRejectCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerRejectCommandInput,
  ) {}
}
@CommandHandler(PhotographerRejectCommand)
export class PhotographerRejectCommandHandler implements ICommandHandler<PhotographerRejectCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
    private readonly publicPhotographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the photographer rejection command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  async execute(message: PhotographerRejectCommand) {
    const result = await this.dataSource.transaction((s) =>
      this.useCases.reject(s, message.actor, message.input),
    );
    await this.publicPhotographersCache.invalidateAll();
    return result;
  }
}

export class PhotographerAwardBadgesCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerAwardBadgesCommandInput,
  ) {}
}
@CommandHandler(PhotographerAwardBadgesCommand)
export class PhotographerAwardBadgesCommandHandler implements ICommandHandler<PhotographerAwardBadgesCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
    private readonly achievementsCache: PhotographerAchievementsCache,
    private readonly publicPhotographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the photographer badge award command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  async execute(message: PhotographerAwardBadgesCommand) {
    const result = await this.dataSource.transaction((s) =>
      this.useCases.awardAllBadges(s, message.actor),
    );
    if (result.awarded > 0)
      await Promise.all([
        this.achievementsCache.invalidateAll(),
        this.publicPhotographersCache.invalidateAll(),
      ]);
    return result;
  }
}
