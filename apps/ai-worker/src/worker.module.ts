import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AiWorkerLensDatabaseModule } from '@shared/database/ai-worker-lens-database.module';
import { EnvModule } from '@shared/platform/env';
import { AiAssistantModule } from '@modules/ai-assistant/ai-assistant.module';
import { AI_REPLY_QUEUE } from './ai-worker.constants';
import { AiReplyProcessor } from './ai-reply.processor';
import { ChatEventsConsumer } from './chat-events.consumer';

@Module({
  imports: [
    EnvModule,
    AiWorkerLensDatabaseModule,
    AiAssistantModule,
    BullModule.forRootAsync({
      imports: [EnvModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          db: Number(config.get<string>('BULLMQ_REDIS_DB', '2')),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({ name: AI_REPLY_QUEUE }),
  ],
  providers: [ChatEventsConsumer, AiReplyProcessor],
})
export class AiWorkerModule {}
