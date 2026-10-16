import { Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { AI_DATABASE_DATA_SOURCE } from '@shared/database/ai-database.module';
import type { Actor } from '@shared/platform/auth/actor';

export class PhotographerAiReplySuggestionsQuery {
  constructor(public readonly actor: Actor) {}
}

@QueryHandler(PhotographerAiReplySuggestionsQuery)
export class PhotographerAiReplySuggestionsQueryHandler implements IQueryHandler<PhotographerAiReplySuggestionsQuery> {
  constructor(
    @InjectDataSource() private readonly lensDataSource: DataSource,
    @Inject(AI_DATABASE_DATA_SOURCE)
    private readonly aiDataSource: DataSource,
  ) {}

  async execute(query: PhotographerAiReplySuggestionsQuery) {
    const photographers: Array<{ id: string }> =
      await this.lensDataSource.query(
        `SELECT photographer.id
         FROM photographers photographer
         JOIN users account ON account.id = photographer.user_id
        WHERE account.keycloak_id = $1
        LIMIT 1`,
        [query.actor.sub],
      );
    const photographerId = photographers[0]?.id;
    if (!photographerId) return [];

    return this.aiDataSource.query(
      `SELECT suggestion.id,
              suggestion.message_id,
              suggestion.channel_id,
              suggestion.action,
              suggestion.intent,
              suggestion.suggested_reply,
              suggestion.retrieval_similarity,
              suggestion.knowledge_item_ids,
              suggestion.risk_flags,
              suggestion.status,
              suggestion.failure_reason,
              suggestion.created_at
         FROM ai_reply_suggestions suggestion
        WHERE suggestion.photographer_id = $1
        ORDER BY suggestion.created_at DESC
        LIMIT 50`,
      [photographerId],
    );
  }
}
