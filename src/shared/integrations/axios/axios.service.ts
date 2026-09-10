import { Injectable } from '@nestjs/common';
import { envConfig } from '../../platform/env/env.config';
import axios, { type AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import type { AxiosCreateParams, AxiosRetryOptions } from './types/axios';
import { computeRetryDelayWithJitter } from './utils/compute-retry-delay';

@Injectable()
export class AxiosService {
  private readonly instances = new Map<string, AxiosInstance>();

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

  get(key: string): AxiosInstance | undefined {
    return this.instances.get(key);
  }

  remove(key: string): boolean {
    return this.instances.delete(key);
  }

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
