import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import type { Actor } from '@shared/platform/auth/actor';
import type * as Inputs from '@shared/contracts/customer.contract';
import { CustomerUseCases } from './customer.use-case';

export class CustomerUpdateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CustomerUpdateCommandInput,
  ) {}
}

@CommandHandler(CustomerUpdateCommand)
export class CustomerUpdateCommandHandler implements ICommandHandler<CustomerUpdateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CustomerUseCases,
  ) {}

  /**
   * Route the customer update command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: CustomerUpdateCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.update(s, message.actor, message.input),
    );
  }
}
