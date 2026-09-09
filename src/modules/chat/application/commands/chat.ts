import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { ChatUseCases } from '../chat';
export class ChatCreateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ChatCreateCommandInput,
  ) {}
}
@CommandHandler(ChatCreateCommand)
export class ChatCreateCommandHandler implements ICommandHandler<ChatCreateCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: ChatUseCases,
  ) {}
  execute(message: ChatCreateCommand) {
    return this.uow.write((s) =>
      this.useCases.create(s, message.actor, message.input),
    );
  }
}

export class ChatAttachmentCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.ChatAttachmentCommandInput,
  ) {}
}
@CommandHandler(ChatAttachmentCommand)
export class ChatAttachmentCommandHandler implements ICommandHandler<ChatAttachmentCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: ChatUseCases,
  ) {}
  execute(message: ChatAttachmentCommand) {
    return this.uow.write((s) =>
      this.useCases.attachment(s, message.actor, message.input),
    );
  }
}
