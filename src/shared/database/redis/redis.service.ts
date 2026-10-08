import { Inject, Injectable, Logger } from '@nestjs/common';
import type { createClient } from 'redis';
import { REDIS_CLIENT } from './redis.constants';

export type RedisClient = ReturnType<typeof createClient>;

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: any,
  ) {}

  /**
   * Get the underlying Redis client instance (useful for Socket.IO adapters, BullMQ, Redlock, etc.).
   *
   * @returns Result of the operation described above.
   */
  public getClient(): RedisClient {
    return this.client;
  }

  /**
   * Store a string value with an optional time to live (TTL).
   *
   * @param key Key used by the operation.
   * @param value String value used by the operation: value.
   * @param ttlSeconds Numeric value used by the operation: ttl seconds.
   * @returns No value is returned.
   */
  public async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, { EX: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  /** Increment a counter and set its expiry atomically on the first increment. */
  public async incrementWithExpiry(
    key: string,
    ttlSeconds: number,
  ): Promise<number> {
    const result = await this.client.eval(
      "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count",
      { keys: [key], arguments: [String(ttlSeconds)] },
    );
    return Number(result);
  }

  /** Atomically delete a key only when its current value matches. */
  public async consumeIfValueMatches(
    key: string,
    expectedValue: string,
  ): Promise<boolean> {
    const result = await this.client.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]); end; return 0",
      { keys: [key], arguments: [expectedValue] },
    );
    return Number(result) === 1;
  }

  /** Atomically read and delete a single-use value. */
  public async getAndDelete(key: string): Promise<string | null> {
    const result = await this.client.eval(
      "local value = redis.call('GET', KEYS[1]); if value then redis.call('DEL', KEYS[1]); end; return value",
      { keys: [key], arguments: [] },
    );
    return typeof result === 'string' ? result : null;
  }

  /**
   * Get a string value by key.
   *
   * @param key Key used by the operation.
   * @returns Result returned by `get`.
   */
  public async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Store an object or JSON value with an optional time to live (TTL).
   *
   * @param key Key used by the operation.
   * @param value value data of type T.
   * @param ttlSeconds Numeric value used by the operation: ttl seconds.
   * @returns No value is returned.
   */
  public async setJson<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.set(key, serialized, ttlSeconds);
  }

  /**
   * Get and parse an object or JSON value by key.
   *
   * @param key Key used by the operation.
   * @returns Result returned by `parse`.
   */
  public async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.error(`Lỗi parse JSON cho key [${key}]:`, err);
      return null;
    }
  }

  /**
   * Delete one or more keys.
   *
   * @param keys List of keys to process.
   * @returns Result returned by `del`.
   */
  public async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.del(keys);
  }

  /**
   * Check whether a key exists.
   *
   * @param key Key used by the operation.
   * @returns Result of the operation described above.
   */
  public async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count > 0;
  }

  /**
   * Publish a message to a channel (Pub/Sub).
   *
   * @param channel String value used by the operation: channel.
   * @param message Command or query message to execute.
   * @returns Result returned by `publish`.
   */
  public async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message);
  }
}
