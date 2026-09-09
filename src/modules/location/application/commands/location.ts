import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { LocationUseCases } from '../location';
import { RealtimePublisher } from '@shared/database/unit-of-work/unit-of-work.port';
import { bookingAccess } from '@shared/common/access';
export class LocationStartCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.LocationStartCommandInput,
  ) {}
}
@CommandHandler(LocationStartCommand)
export class LocationStartCommandHandler implements ICommandHandler<LocationStartCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: LocationUseCases,
  ) {}
  execute(message: LocationStartCommand) {
    return this.uow.write((s) =>
      this.useCases.start(s, message.actor, message.input),
    );
  }
}

export class LocationStopCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.LocationStopCommandInput,
  ) {}
}
@CommandHandler(LocationStopCommand)
export class LocationStopCommandHandler implements ICommandHandler<LocationStopCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: LocationUseCases,
  ) {}
  execute(message: LocationStopCommand) {
    return this.uow.write((s) =>
      this.useCases.stop(s, message.actor, message.input),
    );
  }
}

export class LocationUpdateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.LocationUpdateCommandInput,
  ) {}
}
@CommandHandler(LocationUpdateCommand)
export class LocationUpdateCommandHandler implements ICommandHandler<LocationUpdateCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: LocationUseCases,
    private readonly realtime: RealtimePublisher,
  ) {}
  execute(message: LocationUpdateCommand) {
    return this.uow
      .write(async (s) => {
        const result = await this.useCases.update(
          s,
          message.actor,
          message.input,
        );
        const { recipients } = await bookingAccess(
          s,
          message.actor,
          message.input.id,
          'photographer',
        );
        return { result, recipients };
      })
      .then(({ result, recipients }) => {
        this.realtime.publish(recipients, 'booking.location.updated', result);
        return result;
      });
  }
}
