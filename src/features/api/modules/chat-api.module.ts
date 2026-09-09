import { Module } from '@nestjs/common';
import { ChatController } from '../http/chat.controller';
import {
  ChatAttachmentCommandHandler,
  ChatCreateCommandHandler,
} from '@modules/chat/application/commands/chat';
import {
  ChatListQueryHandler,
  ChatMessagesQueryHandler,
} from '@modules/chat/application/queries/chat';

@Module({
  controllers: [ChatController],
  providers: [
    ChatAttachmentCommandHandler,
    ChatCreateCommandHandler,
    ChatListQueryHandler,
    ChatMessagesQueryHandler,
  ],
})
export class ChatApiModule {}
