import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { ChatUseCases } from './chat';

export class SendMessageCommand {
  constructor(
    public actor: Actor,
    public input: { id: string; client_message_id: string; content: string },
  ) {}
}
export class ReadMessageCommand {
  constructor(
    public actor: Actor,
    public input: { id: string; message_id: string },
  ) {}
}
export class ChatSignalCommand {
  constructor(
    public actor: Actor,
    public input: { id: string; active: boolean },
  ) {}
}
@CommandHandler(SendMessageCommand)
export class SendMessageHandler implements ICommandHandler<SendMessageCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly chat: ChatUseCases,
  ) {}
  execute(c: SendMessageCommand) {
    return this.uow.write((s) => this.chat.send(s, c.actor, c.input));
  }
}
@CommandHandler(ReadMessageCommand)
export class ReadMessageHandler implements ICommandHandler<ReadMessageCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly chat: ChatUseCases,
  ) {}
  execute(c: ReadMessageCommand) {
    return this.uow.write((s) => this.chat.read(s, c.actor, c.input));
  }
}
@CommandHandler(ChatSignalCommand)
export class ChatSignalHandler implements ICommandHandler<ChatSignalCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly chat: ChatUseCases,
  ) {}
  execute(c: ChatSignalCommand) {
    return this.uow.read((s) => this.chat.signal(s, c.actor, c.input));
  }
}
export const realtimeHandlers = [
  SendMessageHandler,
  ReadMessageHandler,
  ChatSignalHandler,
];
