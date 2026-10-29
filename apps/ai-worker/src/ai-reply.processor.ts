import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { Job } from 'bullmq';
import type { Queue } from 'bullmq';
import { AiAssistantService } from '@modules/ai-assistant/ai-assistant.service';
import { AI_REPLY_QUEUE, type AiReplyJobData } from './ai-worker.constants';

@Processor(AI_REPLY_QUEUE, { concurrency: 1 })
export class AiReplyProcessor extends WorkerHost {
  private readonly logger = new Logger(AiReplyProcessor.name);

  constructor(
    private readonly aiAssistant: AiAssistantService,
    private readonly config: ConfigService,
    @InjectQueue(AI_REPLY_QUEUE)
    private readonly queue: Queue<AiReplyJobData>,
  ) {
    super();
  }

  async process(job: Job<AiReplyJobData>): Promise<void> {
    if (job.name !== 'auto-reply') return;
    const event = job.data.event;
    const eventId = event.event_id;
    const context = `eventId=${eventId} messageId=${event.data.message.id}`;
    const attempt = job.attemptsMade + 1;
    this.logger.log(
      `AI job started ${context} attempt=${attempt} presenceCheck=${job.data.presenceChecks ?? 0}`,
    );

    try {
      const shouldRetryWhenOnline = await this.aiAssistant.processAutoReply(
        event,
        job.data.enqueuedAt,
      );
      if (!shouldRetryWhenOnline) {
        this.logger.log(`AI job finished ${context}`);
        return;
      }

      const nextCheck = (job.data.presenceChecks ?? 0) + 1;
      const delay = this.readInteger(
        'AI_OFFLINE_REPLY_POLL_MS',
        30000,
        1000,
        300000,
      );
      const stableEventId = createHash('sha256').update(eventId).digest('hex');
      await this.queue.add(
        'auto-reply',
        { ...job.data, presenceChecks: nextCheck },
        {
          jobId: `ai-${stableEventId}-presence-${nextCheck}`,
          delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 7 * 24 * 60 * 60, count: 10000 },
          removeOnFail: { age: 30 * 24 * 60 * 60 },
        },
      );
      this.logger.log(
        `AI job deferred ${context} reason=photographer_online nextCheck=${nextCheck} delayMs=${delay}`,
      );
    } catch (error) {
      const detail =
        error instanceof Error
          ? `${error.name}: ${error.message.slice(0, 240)}`
          : String(error).slice(0, 240);
      this.logger.error(
        `AI job failed ${context} attempt=${attempt} error=${detail}`,
      );
      throw error;
    }
  }

  private readInteger(
    name: string,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const raw = this.config.get<string>(name);
    const value = raw ? Number(raw) : fallback;
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`${name} must be between ${min} and ${max}`);
    }
    return value;
  }
}
