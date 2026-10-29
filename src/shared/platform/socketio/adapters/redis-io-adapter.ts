import { createAdapter } from '@socket.io/redis-adapter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { RedisClient } from '@shared/database/redis';

/**
 * Shares Socket.IO rooms across multiple pods/instances via Redis Pub/Sub.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private redisClient?: RedisClient;
  private adapterClients: RedisClient[] = [];

  /**
   * Configure the Redis client used by the Socket.IO adapter.
   *
   * @param redisClient redis client data of type RedisClient.
   * @returns No value is returned.
   */
  public setClient(redisClient: RedisClient): void {
    this.redisClient = redisClient;
  }

  /**
   * Connect the Redis clients and return the shared Socket.IO adapter.
   *
   * @returns No value is returned.
   * @throws {Error} Thrown when the operation cannot be completed.
   */
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

  /**
   * Create an IO server after validating the input and business rules.
   *
   * @param port Numeric value used by the operation: port.
   * @param options Options for the operation.
   * @returns Processed server value.
   */
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
   *
   * @param server Value used by the operation: server.
   * @returns No value is returned.
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
