import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { LocationUseCases } from '../location';
export class LocationGetQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.LocationGetQueryInput,
  ) {}
}
@QueryHandler(LocationGetQuery)
export class LocationGetQueryHandler implements IQueryHandler<LocationGetQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: LocationUseCases,
  ) {}
  execute(message: LocationGetQuery) {
    return this.uow.read((s) =>
      this.useCases.get(s, message.actor, message.input),
    );
  }
}
