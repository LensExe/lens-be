import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { NotificationUseCases } from '../notifications';
export class NotificationListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.NotificationListQueryInput,
  ) {}
}
@QueryHandler(NotificationListQuery)
export class NotificationListQueryHandler implements IQueryHandler<NotificationListQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: NotificationUseCases,
  ) {}
  execute(message: NotificationListQuery) {
    return this.uow.read((s) =>
      this.useCases.list(s, message.actor, message.input),
    );
  }
}
