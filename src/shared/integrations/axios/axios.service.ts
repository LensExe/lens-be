import { Injectable } from '@nestjs/common';
import { envConfig } from '../../platform/env/env.config';
import axios, { type AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import type { AxiosCreateParams, AxiosRetryOptions } from './types/axios';
import { computeRetryDelayWithJitter } from './utils/compute-retry-delay';

@Injectable()
export class AxiosService {
  private readonly instances = new Map<string, AxiosInstance>();

  /**
   * Create an Axios client after validating the input and business rules.
   *
   * @param param Object containing the HTTP client identifier, Axios configuration, and retry policy.
   * @returns Result of the operation described above.
   */
  create({ key, config, retry }: AxiosCreateParams): AxiosInstance {
    const existing = this.instances.get(key);
    if (existing) return existing;

    const defaults = envConfig().axios;
    const instance = axios.create({
      ...config,
      timeout: config?.timeout ?? defaults.timeoutMs,
    });
    this.addRetry(instance, {
      retries: retry?.retries ?? defaults.retry.retries,
      baseDelayMs: retry?.baseDelayMs ?? defaults.retry.baseDelayMs,
      maxDelayMs: retry?.maxDelayMs ?? defaults.retry.maxDelayMs,
    });
    this.instances.set(key, instance);
    return instance;
  }

  /**
   * Get an Axios client by its key.
   *
   * @param key Key used by the operation.
   * @returns Result returned by `get`.
   */
  get(key: string): AxiosInstance | undefined {
    return this.instances.get(key);
  }

  /**
   * Remove the HTTP client with the specified key from the client manager.
   *
   * @param key Key used by the operation.
   * @returns Result returned by `delete`.
   */
  remove(key: string): boolean {
    return this.instances.delete(key);
  }

  /**
   * Attach retry rules and retry delays to the HTTP client.
   *
   * @param instance instance data of type AxiosInstance.
   * @param options Options for the operation.
   * @returns No value is returned.
   */
  private addRetry(instance: AxiosInstance, options: AxiosRetryOptions): void {
    axiosRetry(instance, {
      retries: options.retries,
      shouldResetTimeout: true,
      retryCondition: (error) =>
        axiosRetry.isNetworkOrIdempotentRequestError(error),
      retryDelay: (retryCount) =>
        computeRetryDelayWithJitter({
          retryCount,
          baseDelayMs: options.baseDelayMs,
          maxDelayMs: options.maxDelayMs,
        }),
    });
  }
}
