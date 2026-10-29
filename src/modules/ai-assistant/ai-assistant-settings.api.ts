import { Inject, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  CommandHandler,
  QueryHandler,
  type ICommandHandler,
  type IQueryHandler,
} from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { AI_DATABASE_DATA_SOURCE } from '@shared/database/ai-database.module';
import type { Actor } from '@shared/platform/auth/actor';
import type { AiAssistantSettings } from './ai-assistant.types';

const DEFAULT_SETTINGS: AiAssistantSettings = {
  enabled: false,
  auto_reply_enabled: false,
  tone_instructions: null,
  min_similarity: 0.62,
};

interface AiAssistantSettingsPatch {
  enabled?: boolean;
  autoReplyEnabled?: boolean;
  toneInstructions?: string | null;
  minSimilarity?: number;
}

interface PhotographerRow {
  id: string;
}

export class PhotographerAiAssistantSettingsQuery {
  constructor(public readonly actor: Actor) {}
}

@QueryHandler(PhotographerAiAssistantSettingsQuery)
export class PhotographerAiAssistantSettingsQueryHandler implements IQueryHandler<PhotographerAiAssistantSettingsQuery> {
  constructor(
    @InjectDataSource() private readonly lensDataSource: DataSource,
    @Inject(AI_DATABASE_DATA_SOURCE)
    private readonly aiDataSource: DataSource,
  ) {}

  async execute(query: PhotographerAiAssistantSettingsQuery) {
    const photographerId = await this.photographerId(query.actor.sub);
    const rows: Array<{
      enabled: boolean;
      autoReplyEnabled: boolean;
      toneInstructions: string | null;
      minSimilarity: number | string;
    }> = await this.aiDataSource.query(
      `SELECT enabled,
              auto_reply_enabled AS "autoReplyEnabled",
              tone_instructions AS "toneInstructions",
              min_similarity AS "minSimilarity"
         FROM ai_assistant_settings
        WHERE photographer_id = $1`,
      [photographerId],
    );
    const settings = rows[0];
    return settings
      ? { ...settings, minSimilarity: Number(settings.minSimilarity) }
      : {
          enabled: DEFAULT_SETTINGS.enabled,
          autoReplyEnabled: DEFAULT_SETTINGS.auto_reply_enabled,
          toneInstructions: DEFAULT_SETTINGS.tone_instructions,
          minSimilarity: DEFAULT_SETTINGS.min_similarity,
        };
  }

  private async photographerId(subject: string): Promise<string> {
    const rows: PhotographerRow[] = await this.lensDataSource.query(
      `SELECT photographer.id
         FROM photographers photographer
         JOIN users account ON account.id = photographer.user_id
        WHERE account.keycloak_id = $1
        LIMIT 1`,
      [subject],
    );
    const photographerId = rows[0]?.id;
    if (!photographerId)
      throw new NotFoundException('Photographer profile not found');
    return photographerId;
  }
}

export class UpdatePhotographerAiAssistantSettingsCommand {
  constructor(
    public readonly actor: Actor,
    public readonly patch: AiAssistantSettingsPatch,
  ) {}
}

@CommandHandler(UpdatePhotographerAiAssistantSettingsCommand)
export class UpdatePhotographerAiAssistantSettingsCommandHandler implements ICommandHandler<UpdatePhotographerAiAssistantSettingsCommand> {
  constructor(
    @InjectDataSource() private readonly lensDataSource: DataSource,
    @Inject(AI_DATABASE_DATA_SOURCE)
    private readonly aiDataSource: DataSource,
  ) {}

  async execute(command: UpdatePhotographerAiAssistantSettingsCommand) {
    const photographers: PhotographerRow[] = await this.lensDataSource.query(
      `SELECT photographer.id
         FROM photographers photographer
         JOIN users account ON account.id = photographer.user_id
        WHERE account.keycloak_id = $1
        LIMIT 1`,
      [command.actor.sub],
    );
    const photographerId = photographers[0]?.id;
    if (!photographerId)
      throw new NotFoundException('Photographer profile not found');

    const existingRows: AiAssistantSettings[] = await this.aiDataSource.query(
      `SELECT enabled, auto_reply_enabled, tone_instructions, min_similarity
         FROM ai_assistant_settings
        WHERE photographer_id = $1`,
      [photographerId],
    );
    const current = existingRows[0] ?? DEFAULT_SETTINGS;
    const enabled = command.patch.enabled ?? current.enabled;
    const settings: AiAssistantSettings = {
      enabled,
      auto_reply_enabled: enabled
        ? (command.patch.autoReplyEnabled ?? current.auto_reply_enabled)
        : false,
      tone_instructions:
        command.patch.toneInstructions === undefined
          ? current.tone_instructions
          : command.patch.toneInstructions,
      min_similarity: command.patch.minSimilarity ?? current.min_similarity,
    };

    const savedRows: Array<{
      enabled: boolean;
      autoReplyEnabled: boolean;
      toneInstructions: string | null;
      minSimilarity: number | string;
    }> = await this.aiDataSource.query(
      `INSERT INTO ai_assistant_settings (
         photographer_id, enabled, auto_reply_enabled,
         tone_instructions, min_similarity
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (photographer_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         auto_reply_enabled = EXCLUDED.auto_reply_enabled,
         tone_instructions = EXCLUDED.tone_instructions,
         min_similarity = EXCLUDED.min_similarity,
         updated_at = now()
       RETURNING enabled,
                 auto_reply_enabled AS "autoReplyEnabled",
                 tone_instructions AS "toneInstructions",
                 min_similarity AS "minSimilarity"`,
      [
        photographerId,
        settings.enabled,
        settings.auto_reply_enabled,
        settings.tone_instructions,
        settings.min_similarity,
      ],
    );
    const saved = savedRows[0];
    return {
      ...saved,
      minSimilarity: Number(saved.minSimilarity),
    };
  }
}
