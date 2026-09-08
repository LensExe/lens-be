import { ConsoleLogger, Injectable } from '@nestjs/common';

/**
 * Nest ConsoleLogger that swallows noisy framework chatter so boot logs stay readable.
 */
@Injectable()
export class ContextLoggerService extends ConsoleLogger {
  override log(...params: Parameters<ConsoleLogger['log']>): void {
    if (params[1] === 'ClientProxy') {
      return;
    }
    super.log(...params);
  }

  override debug(): void {
    // Disabled in standard operational mode
  }

  override fatal(...params: Parameters<ConsoleLogger['fatal']>): void {
    super.fatal(...params);
  }
}
