import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { ChatUseCases } from '../chat';
export class ChatListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ChatListQueryInput,
  ) {}
}
@QueryHandler(ChatListQuery)
export class ChatListQueryHandler implements IQueryHandler<ChatListQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: ChatUseCases,
  ) {}
  execute(message: ChatListQuery) {
    return this.uow.read((s) =>
      this.useCases.list(s, message.actor, message.input),
    );
  }
}

export class ChatMessagesQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ChatMessagesQueryInput,
  ) {}
}
@QueryHandler(ChatMessagesQuery)
export class ChatMessagesQueryHandler implements IQueryHandler<ChatMessagesQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: ChatUseCases,
  ) {}
  execute(message: ChatMessagesQuery) {
    return this.uow.read((s) =>
      this.useCases.messages(s, message.actor, message.input),
    );
  }
}
