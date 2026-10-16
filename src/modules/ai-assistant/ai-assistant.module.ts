import { Module } from '@nestjs/common';
import { AiDatabaseModule } from '@shared/database/ai-database.module';
import { AiWorkerLensDatabaseModule } from '@shared/database/ai-worker-lens-database.module';
import { AiAssistantRepository } from './ai-assistant.repository';
import { AiAssistantService } from './ai-assistant.service';
import { ChatServiceClient } from './chat-service.client';
import { OllamaClient } from './ollama.client';
import { PresenceClient } from './presence.client';

@Module({
  imports: [AiDatabaseModule, AiWorkerLensDatabaseModule],
  providers: [
    AiAssistantRepository,
    AiAssistantService,
    ChatServiceClient,
    OllamaClient,
    PresenceClient,
  ],
  exports: [AiAssistantService],
})
export class AiAssistantModule {}
