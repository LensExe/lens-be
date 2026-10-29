import { ConsoleLogger, Injectable } from '@nestjs/common';

/**
 * Nest ConsoleLogger that swallows noisy framework chatter so boot logs stay readable.
 */
@Injectable()
export class ContextLoggerService extends ConsoleLogger {
  /**
   * Write an informational log entry with the current request context.
   *
   * @param params Value used by the operation: params.
   * @returns No value is returned.
   */
  override log(...params: Parameters<ConsoleLogger['log']>): void {
    if (params[1] === 'ClientProxy') {
      return;
    }
    super.log(...params);
  }

  /**
   * Write a debug log entry with the current request context.
   *
   * @returns No value is returned.
   */
  override debug(): void {
    // Disabled in standard operational mode
  }

  /**
   * Write a critical error log entry with context and exception details.
   *
   * @param params Value used by the operation: params.
   * @returns No value is returned.
   */
  override fatal(...params: Parameters<ConsoleLogger['fatal']>): void {
    super.fatal(...params);
  }
}
