import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DataSource } from 'typeorm';
import { KeycloakService } from '@shared/integrations/keycloak/keycloak.service';
import { RealtimePublisher } from '@shared/integrations/realtime/realtime-publisher.port';
import type { Actor } from '@shared/platform/auth/actor';
import { currentUser } from '@shared/common/access';
import { DomainError } from '@shared/platform/exceptions/domain.error';
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
    private readonly dataSource: DataSource,
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
        user = await currentUser(this.dataSource.manager, actor);
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
}

export { LensGateway as SocketioGateway };
