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

  /**
   * Read and validate the access token from the socket handshake.
   *
   * @param socket Socket.IO connection being processed.
   * @returns Processed token value.
   */
  private token(socket: Socket): string {
    const token: unknown = socket.handshake.auth?.token;
    if (typeof token !== 'string')
      throw new DomainError('forbidden', 'Access token required');
    return token;
  }

  /**
   * Get the current user from the authenticated socket.
   *
   * @param socket Socket.IO connection being processed.
   * @returns Result object containing the fields `sub`, `email`, `roles`.
   */
  private async actor(socket: Socket): Promise<Actor> {
    const token = await this.keycloak.verifyToken(this.token(socket));
    return { sub: token.sub, email: token.email, roles: token.roles ?? [] };
  }

  /**
   * Authenticate a newly connected socket and attach the user identity to the session.
   *
   * @param socket Socket.IO connection being processed.
   * @returns No value is returned.
   */
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

  /**
   * Clean up session state when the socket disconnects.
   *
   * @param socket Socket.IO connection being processed.
   * @returns No value is returned.
   */
  handleDisconnect(socket: Socket) {
    clearTimeout(
      socket.data.expiry as ReturnType<typeof setTimeout> | undefined,
    );
  }

  /**
   * Emit a real-time event to the specified users.
   *
   * @param userIds List of user IDs to process.
   * @param topic String value used by the operation: topic.
   * @param payload Event payload.
   * @returns Result returned by `resolve`.
   */
  publish(userIds: string[], topic: string, payload: unknown): Promise<void> {
    for (const id of new Set(userIds))
      this.server?.to(`user:${id}`).emit(topic, payload);
    return Promise.resolve();
  }
}

export { LensGateway as SocketioGateway };
