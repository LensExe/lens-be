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
   * Lấy instance client gốc của redis (hữu ích cho SocketIO adapter, BullMQ, Redlock...)
   */
  public getClient(): RedisClient {
    return this.client;
  }

  /**
   * Lưu giá trị string với thời gian sống (TTL) tuỳ chọn
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

  /**
   * Lấy giá trị chuỗi theo key
   */
  public async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Lưu đối tượng Object/JSON với thời gian sống (TTL) tuỳ chọn
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
   * Lấy và parse đối tượng Object/JSON theo key
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
   * Xóa một hoặc nhiều key
   */
  public async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.del(keys);
  }

  /**
   * Kiểm tra key có tồn tại hay không
   */
  public async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count > 0;
  }

  /**
   * Publish một message lên channel (Pub/Sub)
   */
  public async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message);
  }
}
