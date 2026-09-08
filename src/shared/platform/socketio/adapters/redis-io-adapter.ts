import { createAdapter } from '@socket.io/redis-adapter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { createClient } from 'redis';

export type RedisClient = ReturnType<typeof createClient>;

/**
 * Shares Socket.IO rooms across multiple pods/instances via Redis Pub/Sub.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private redisClient?: RedisClient;
  private adapterClients: RedisClient[] = [];

  public setClient(redisClient: RedisClient): void {
    this.redisClient = redisClient;
  }

  public async connect(): Promise<void> {
    if (!this.redisClient) {
      throw new Error(
        'Redis client must be set before connecting RedisIoAdapter. Call adapter.setClient(client).',
      );
    }
    const pubClient = this.redisClient.duplicate();
    const subClient = this.redisClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.adapterClients = [pubClient, subClient];
  }

  override createIOServer(
    port: number,
    options?: Parameters<IoAdapter['createIOServer']>[1],
  ): ReturnType<IoAdapter['createIOServer']> {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  /**
   * Close Socket.IO server and any Redis connections created by this adapter.
   */
  override async close(
    server: Parameters<IoAdapter['close']>[0],
  ): Promise<void> {
    await super.close(server);
    const clients = this.adapterClients;
    this.adapterClients = [];
    await Promise.allSettled(
      clients.map(async (client) => {
        if (client.isOpen) {
          await client.quit();
        }
      }),
    );
  }
}
