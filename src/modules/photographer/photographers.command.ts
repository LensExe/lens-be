import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { PhotographerUseCases } from './photographer.use-case';

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
  ) {}
  execute(message: PhotographerLocationCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.location(s, message.actor, message.input),
    );
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
  ) {}
  execute(message: PhotographerStatusCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.status(s, message.actor, message.input),
    );
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
  ) {}
  execute(message: PhotographerUpdateCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.update(s, message.actor, message.input),
    );
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
  ) {}
  execute(message: PhotographerApproveCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.approve(s, message.actor, message.input),
    );
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
  ) {}
  execute(message: PhotographerRejectCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.reject(s, message.actor, message.input),
    );
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
  ) {}
  execute(message: PhotographerAwardBadgesCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.awardAllBadges(s, message.actor),
    );
  }
}
