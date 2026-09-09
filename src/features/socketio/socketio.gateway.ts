import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { CommandBus } from '@nestjs/cqrs';
import {
  IsUUID,
  IsString,
  MinLength,
  MaxLength,
  IsBoolean,
  validate,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Server, Socket } from 'socket.io';
import { KeycloakService } from '@shared/integrations/keycloak/keycloak.service';
import {
  UnitOfWork,
  RealtimePublisher,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { currentUser } from '@shared/common/access';
import {
  SendMessageCommand,
  ReadMessageCommand,
  ChatSignalCommand,
} from '@modules/chat/application/realtime';
import { ChatUseCases } from '@modules/chat/application/chat';
import { DomainError } from '@shared/platform/exceptions/domain.error';

class ConversationInput {
  @IsUUID() id!: string;
}
class SendInput extends ConversationInput {
  @IsUUID() client_message_id!: string;
  @IsString() @MinLength(1) @MaxLength(10000) content!: string;
}
class ReadInput extends ConversationInput {
  @IsUUID() message_id!: string;
}
class SignalInput extends ConversationInput {
  @IsBoolean() active!: boolean;
}
@WebSocketGateway({
  namespace: '/lens',
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  },
  maxHttpBufferSize: 128 * 1024,
})
export class LensGateway extends RealtimePublisher {
  @WebSocketServer() server!: Server;
  constructor(
    private readonly keycloak: KeycloakService,
    private readonly uow: UnitOfWork,
    private readonly commands: CommandBus,
    private readonly chat: ChatUseCases,
  ) {
    super();
  }
  private token(socket: Socket): string {
    const token: unknown = socket.handshake.auth?.token;
    if (typeof token !== 'string')
      throw new DomainError('forbidden', 'Access token required');
    return token;
  }
  private async actor(socket: Socket): Promise<Actor> {
    const token = await this.keycloak.verifyToken(this.token(socket));
    return { sub: token.sub, email: token.email, roles: token.roles ?? [] };
  }
  async handleConnection(socket: Socket) {
    try {
      const actor = await this.actor(socket),
        user = await this.uow.read((s) => currentUser(s, actor));
      socket.data.userId = user.id;
      await socket.join(`user:${user.id}`);
      const token = await this.keycloak.verifyToken(this.token(socket));
      socket.data.expiry = setTimeout(
        () => socket.disconnect(true),
        Math.min(2147483647, Math.max(0, token.exp! * 1000 - Date.now())),
      );
    } catch {
      socket.disconnect(true);
    }
  }
  handleDisconnect(socket: Socket) {
    clearTimeout(
      socket.data.expiry as ReturnType<typeof setTimeout> | undefined,
    );
  }
  publish(userIds: string[], topic: string, payload: unknown) {
    for (const id of new Set(userIds))
      this.server?.to(`user:${id}`).emit(topic, payload);
  }
  private async handle<T extends ConversationInput>(
    socket: Socket,
    raw: unknown,
    type: new () => T,
    topic: string,
    command: (actor: Actor, input: T) => object,
  ) {
    try {
      const input = plainToInstance(type, raw);
      const errors = await validate(input, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      });
      if (errors.length)
        throw new DomainError('invalid', 'Invalid realtime payload');
      const actor = await this.actor(socket);
      await this.uow.read((s) => this.chat.participant(s, actor, input.id));
      const result = await this.commands.execute(command(actor, input));
      const { conversation: c } = await this.uow.read((s) =>
        this.chat.participant(s, actor, input.id),
      );
      this.publish([c.customer_user_id, c.photographer_user_id], topic, result);
      return { ok: true, data: result };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof DomainError
            ? error.message
            : 'Authentication or request failed',
      };
    }
  }
  @SubscribeMessage('message.send') send(
    @ConnectedSocket() s: Socket,
    @MessageBody() b: unknown,
  ) {
    return this.handle(
      s,
      b,
      SendInput,
      'message.created',
      (a, i) => new SendMessageCommand(a, i),
    );
  }
  @SubscribeMessage('message.read') read(
    @ConnectedSocket() s: Socket,
    @MessageBody() b: unknown,
  ) {
    return this.handle(
      s,
      b,
      ReadInput,
      'message.read',
      (a, i) => new ReadMessageCommand(a, i),
    );
  }
  @SubscribeMessage('typing.start') typingStart(
    @ConnectedSocket() s: Socket,
    @MessageBody() b: unknown,
  ) {
    return this.handle(
      s,
      b,
      ConversationInput,
      'typing.start',
      (a, i) => new ChatSignalCommand(a, { ...i, active: true }),
    );
  }
  @SubscribeMessage('typing.stop') typingStop(
    @ConnectedSocket() s: Socket,
    @MessageBody() b: unknown,
  ) {
    return this.handle(
      s,
      b,
      ConversationInput,
      'typing.stop',
      (a, i) => new ChatSignalCommand(a, { ...i, active: false }),
    );
  }
  @SubscribeMessage('presence.update') presence(
    @ConnectedSocket() s: Socket,
    @MessageBody() b: unknown,
  ) {
    return this.handle(
      s,
      b,
      SignalInput,
      'presence.update',
      (a, i) => new ChatSignalCommand(a, i),
    );
  }
}

export { LensGateway as SocketioGateway };
