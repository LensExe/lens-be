import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { BookingPlanUseCases } from './booking-plan.use-case';
import { PublicBookingPlansCache } from './public-booking-plans.cache';
import { PublicPhotographersQueryCache } from '../public-photographers-query.cache';

export class BookingPlanCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingPlanCreateCommandInput,
  ) {}
}
@CommandHandler(BookingPlanCreateCommand)
export class BookingPlanCreateCommandHandler implements ICommandHandler<BookingPlanCreateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingPlanUseCases,
    private readonly publicBookingPlansCache: PublicBookingPlansCache,
    private readonly publicPhotographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the booking plan creation command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  async execute(message: BookingPlanCreateCommand) {
    const result = await this.dataSource.transaction((s) =>
      this.useCases.create(s, message.actor, message.input),
    );
    await Promise.all([
      this.publicBookingPlansCache.invalidate(result.photographer_id),
      this.publicPhotographersCache.invalidateAll(),
    ]);
    return result;
  }
}

export class BookingPlanUpdateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingPlanUpdateCommandInput,
  ) {}
}
@CommandHandler(BookingPlanUpdateCommand)
export class BookingPlanUpdateCommandHandler implements ICommandHandler<BookingPlanUpdateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingPlanUseCases,
    private readonly publicBookingPlansCache: PublicBookingPlansCache,
    private readonly publicPhotographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the booking plan update command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  async execute(message: BookingPlanUpdateCommand) {
    const result = await this.dataSource.transaction((s) =>
      this.useCases.update(s, message.actor, message.input),
    );
    await Promise.all([
      this.publicBookingPlansCache.invalidate(result.photographer_id),
      this.publicPhotographersCache.invalidateAll(),
    ]);
    return result;
  }
}

export class BookingPlanRemoveCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BookingPlanRemoveCommandInput,
  ) {}
}
@CommandHandler(BookingPlanRemoveCommand)
export class BookingPlanRemoveCommandHandler implements ICommandHandler<BookingPlanRemoveCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BookingPlanUseCases,
    private readonly publicBookingPlansCache: PublicBookingPlansCache,
    private readonly publicPhotographersCache: PublicPhotographersQueryCache,
  ) {}

  /**
   * Route the booking plan deletion command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  async execute(message: BookingPlanRemoveCommand) {
    const result = await this.dataSource.transaction((s) =>
      this.useCases.remove(s, message.actor, message.input),
    );
    await Promise.all([
      this.publicBookingPlansCache.invalidate(result.photographer_id),
      this.publicPhotographersCache.invalidateAll(),
    ]);
    return { deleted: true };
  }
}
