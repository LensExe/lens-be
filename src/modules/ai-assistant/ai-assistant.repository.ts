import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AI_DATABASE_DATA_SOURCE } from '@shared/database/ai-database.module';
import { AI_WORKER_LENS_DATA_SOURCE } from '@shared/database/ai-worker-lens-database.module';
import type {
  AiAssistantSettings,
  AiKnowledgeItem,
  AiReplySuggestionStatus,
  ChatMessageCreatedEvent,
  PhotographerAiContext,
  PhotographerBookingPlan,
  RetrievedKnowledgeItem,
} from './ai-assistant.types';

@Injectable()
export class AiAssistantRepository {
  constructor(
    @Inject(AI_WORKER_LENS_DATA_SOURCE)
    private readonly lensDataSource: DataSource,
    @Inject(AI_DATABASE_DATA_SOURCE)
    private readonly aiDataSource: DataSource,
  ) {}

  async hasProcessedEvent(eventId: string): Promise<boolean> {
    const rows: Array<{ exists: boolean }> = await this.aiDataSource.query(
      'SELECT EXISTS (SELECT 1 FROM ai_reply_suggestions WHERE event_id = $1) AS exists',
      [eventId],
    );
    return rows[0]?.exists === true;
  }

  async findPhotographer(
    participantIds: string[],
  ): Promise<PhotographerAiContext | null> {
    const participants = [...new Set(participantIds)];
    if (participants.length === 0) return null;
    const rows: PhotographerAiContext[] = await this.lensDataSource.query(
      `SELECT p.id,
              u.keycloak_id,
              u.fullname,
              p.description,
              p.location,
              p.styles
         FROM photographers p
         JOIN users u ON u.id = p.user_id
        WHERE u.keycloak_id = ANY($1::text[])
          AND p.is_verified = true
        LIMIT 2`,
      [participants],
    );
    return rows.length === 1 ? rows[0] : null;
  }

  async findSettings(
    photographerId: string,
  ): Promise<AiAssistantSettings | null> {
    const rows: AiAssistantSettings[] = await this.aiDataSource.query(
      `SELECT enabled, auto_reply_enabled, tone_instructions, min_similarity
         FROM ai_assistant_settings
        WHERE photographer_id = $1`,
      [photographerId],
    );
    return rows[0] ?? null;
  }

  async findActiveKnowledge(
    photographerId: string,
  ): Promise<AiKnowledgeItem[]> {
    return this.aiDataSource.query(
      `SELECT id,
              question,
              answer,
              alternatives,
              embedding::text AS embedding_text,
              embedding_model
         FROM ai_knowledge_items
        WHERE photographer_id = $1
          AND is_active = true
          AND (valid_from IS NULL OR valid_from <= now())
          AND (valid_until IS NULL OR valid_until > now())
        ORDER BY updated_at DESC
        LIMIT 200`,
      [photographerId],
    );
  }

  async saveKnowledgeEmbedding(
    knowledgeId: string,
    embedding: number[],
    modelName: string,
  ): Promise<void> {
    await this.aiDataSource.query(
      `UPDATE ai_knowledge_items
          SET embedding = $2::vector,
              embedding_model = $3,
              updated_at = now()
        WHERE id = $1`,
      [knowledgeId, this.toVectorLiteral(embedding), modelName],
    );
  }

  async findRelevantKnowledge(
    photographerId: string,
    embedding: number[],
    modelName: string,
    limit = 5,
  ): Promise<RetrievedKnowledgeItem[]> {
    const rows: Array<
      RetrievedKnowledgeItem & { similarity: number | string }
    > = await this.aiDataSource.query(
      `SELECT id,
                question,
                answer,
                1 - (embedding <=> $2::vector) AS similarity
           FROM ai_knowledge_items
          WHERE photographer_id = $1
            AND is_active = true
            AND embedding IS NOT NULL
            AND embedding_model = $3
            AND (valid_from IS NULL OR valid_from <= now())
            AND (valid_until IS NULL OR valid_until > now())
          ORDER BY embedding <=> $2::vector
          LIMIT $4`,
      [photographerId, this.toVectorLiteral(embedding), modelName, limit],
    );
    return rows.map((row) => ({ ...row, similarity: Number(row.similarity) }));
  }

  async findActiveBookingPlans(
    photographerId: string,
  ): Promise<PhotographerBookingPlan[]> {
    return this.lensDataSource.query(
      `SELECT name,
              description,
              price::text AS price,
              duration_minutes,
              photo_count,
              retouched_photo_count,
              delivery_days,
              features
         FROM booking_plans
        WHERE photographer_id = $1
          AND is_active = true
        ORDER BY price ASC
        LIMIT 20`,
      [photographerId],
    );
  }

  async saveSuggestion(input: {
    event: ChatMessageCreatedEvent;
    photographerId: string;
    action: 'answer' | 'ask_clarification' | 'handoff';
    intent: string;
    reply: string | null;
    similarity: number | null;
    knowledgeIds: string[];
    riskFlags: string[];
    status: AiReplySuggestionStatus;
    failureReason?: string | null;
  }): Promise<void> {
    await this.aiDataSource.query(
      `INSERT INTO ai_reply_suggestions (
         event_id,
         message_id,
         channel_id,
         photographer_id,
         source_sender_id,
         action,
         intent,
         suggested_reply,
         retrieval_similarity,
         knowledge_item_ids,
         risk_flags,
         status,
         failure_reason
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::uuid[], $11::jsonb, $12, $13
       )
       ON CONFLICT (event_id) DO UPDATE SET
         action = EXCLUDED.action,
         intent = EXCLUDED.intent,
         suggested_reply = EXCLUDED.suggested_reply,
         retrieval_similarity = EXCLUDED.retrieval_similarity,
         knowledge_item_ids = EXCLUDED.knowledge_item_ids,
         risk_flags = EXCLUDED.risk_flags,
         status = EXCLUDED.status,
         failure_reason = EXCLUDED.failure_reason,
         updated_at = now()`,
      [
        input.event.event_id,
        input.event.data.message.id,
        input.event.data.channel_id,
        input.photographerId,
        input.event.data.message.sender_id,
        input.action,
        input.intent,
        input.reply,
        input.similarity,
        input.knowledgeIds,
        JSON.stringify(input.riskFlags),
        input.status,
        input.failureReason ?? null,
      ],
    );
  }

  private toVectorLiteral(values: number[]): string {
    return `[${values.join(',')}]`;
  }
}
