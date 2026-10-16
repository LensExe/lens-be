import { Module } from '@nestjs/common';
import { AiDatabaseModule } from '@shared/database/ai-database.module';
import {
  CreatePhotographerAiFaqCommandHandler,
  DeletePhotographerAiFaqCommandHandler,
  PhotographerAiFaqsQueryHandler,
  UpdatePhotographerAiFaqCommandHandler,
} from '@modules/ai-assistant/ai-assistant-faqs.api';
import { PhotographerAiReplySuggestionsQueryHandler } from '@modules/ai-assistant/ai-reply-suggestions.query';
import {
  PhotographerAiAssistantSettingsQueryHandler,
  UpdatePhotographerAiAssistantSettingsCommandHandler,
} from '@modules/ai-assistant/ai-assistant-settings.api';
import { AiReplySuggestionsController } from '../http/ai-reply-suggestions.controller';
import { OllamaClient } from '@modules/ai-assistant/ollama.client';

@Module({
  imports: [AiDatabaseModule],
  controllers: [AiReplySuggestionsController],
  providers: [
    PhotographerAiReplySuggestionsQueryHandler,
    PhotographerAiFaqsQueryHandler,
    CreatePhotographerAiFaqCommandHandler,
    UpdatePhotographerAiFaqCommandHandler,
    DeletePhotographerAiFaqCommandHandler,
    PhotographerAiAssistantSettingsQueryHandler,
    UpdatePhotographerAiAssistantSettingsCommandHandler,
    OllamaClient,
  ],
})
export class AiReplySuggestionsApiModule {}
