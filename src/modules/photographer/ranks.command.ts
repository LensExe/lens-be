import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { RankUseCases } from './rank.use-case';

export class RankUpdateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.RankUpdateCommandInput,
  ) {}
}
@CommandHandler(RankUpdateCommand)
export class RankUpdateCommandHandler implements ICommandHandler<RankUpdateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RankUseCases,
  ) {}
  execute(message: RankUpdateCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.update(s, message.actor, message.input),
    );
  }
}
