import {
  BadRequestException,
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
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
import { OllamaClient } from './ollama.client';

interface PhotographerRow {
  id: string;
}

interface AiFaqRow {
  id: string;
  question: string;
  answer: string;
  alternatives: string[];
  isActive: boolean;
  updatedAt: Date;
}

interface AiFaqPatch {
  question?: string;
  answer?: string;
  alternatives?: string[];
  isActive?: boolean;
}

async function findPhotographerId(
  lensDataSource: DataSource,
  subject: string,
): Promise<string> {
  const rows: PhotographerRow[] = await lensDataSource.query(
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

function normalizeAlternatives(values: string[] = []): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      const normalized = value.toLocaleLowerCase();
      if (!value || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

async function createEmbedding(
  ollama: OllamaClient,
  question: string,
  alternatives: string[],
): Promise<{ literal: string; model: string }> {
  const [embedding] = await ollama.embed(
    [[question, ...alternatives].join('\n')],
    undefined,
    'faq_management',
  );
  if (!embedding) throw new Error('Ollama did not return an FAQ embedding');
  return {
    literal: `[${embedding.join(',')}]`,
    model: ollama.embeddingModelName,
  };
}

export class PhotographerAiFaqsQuery {
  constructor(public readonly actor: Actor) {}
}

@QueryHandler(PhotographerAiFaqsQuery)
export class PhotographerAiFaqsQueryHandler implements IQueryHandler<PhotographerAiFaqsQuery> {
  constructor(
    @InjectDataSource() private readonly lensDataSource: DataSource,
    @Inject(AI_DATABASE_DATA_SOURCE)
    private readonly aiDataSource: DataSource,
  ) {}

  async execute(query: PhotographerAiFaqsQuery): Promise<AiFaqRow[]> {
    const photographerId = await findPhotographerId(
      this.lensDataSource,
      query.actor.sub,
    );
    return this.aiDataSource.query(
      `SELECT id,
              question,
              answer,
              alternatives,
              is_active AS "isActive",
              updated_at AS "updatedAt"
         FROM ai_knowledge_items
        WHERE photographer_id = $1
        ORDER BY updated_at DESC, question ASC`,
      [photographerId],
    );
  }
}

export class CreatePhotographerAiFaqCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: {
      question: string;
      answer: string;
      alternatives?: string[];
    },
  ) {}
}

@CommandHandler(CreatePhotographerAiFaqCommand)
export class CreatePhotographerAiFaqCommandHandler implements ICommandHandler<CreatePhotographerAiFaqCommand> {
  constructor(
    @InjectDataSource() private readonly lensDataSource: DataSource,
    @Inject(AI_DATABASE_DATA_SOURCE)
    private readonly aiDataSource: DataSource,
    private readonly ollama: OllamaClient,
  ) {}

  async execute(command: CreatePhotographerAiFaqCommand): Promise<AiFaqRow> {
    const photographerId = await findPhotographerId(
      this.lensDataSource,
      command.actor.sub,
    );
    const question = command.input.question.trim();
    const answer = command.input.answer.trim();
    const alternatives = normalizeAlternatives(command.input.alternatives);
    if (!question || !answer) {
      throw new BadRequestException('Question and answer must not be blank');
    }

    const duplicates: Array<{ id: string }> = await this.aiDataSource.query(
      `SELECT id
         FROM ai_knowledge_items
        WHERE photographer_id = $1
          AND lower(question) = lower($2)
        LIMIT 1`,
      [photographerId, question],
    );
    if (duplicates.length > 0) {
      throw new ConflictException('An FAQ with this question already exists');
    }

    const embedding = await createEmbedding(
      this.ollama,
      question,
      alternatives,
    );
    const rows: AiFaqRow[] = await this.aiDataSource.query(
      `INSERT INTO ai_knowledge_items (
         photographer_id, question, answer, alternatives,
         embedding, embedding_model, is_active
       ) VALUES ($1, $2, $3, $4, $5::vector, $6, true)
       RETURNING id,
                 question,
                 answer,
                 alternatives,
                 is_active AS "isActive",
                 updated_at AS "updatedAt"`,
      [
        photographerId,
        question,
        answer,
        alternatives,
        embedding.literal,
        embedding.model,
      ],
    );
    return rows[0];
  }
}

export class UpdatePhotographerAiFaqCommand {
  constructor(
    public readonly actor: Actor,
    public readonly faqId: string,
    public readonly patch: AiFaqPatch,
  ) {}
}

@CommandHandler(UpdatePhotographerAiFaqCommand)
export class UpdatePhotographerAiFaqCommandHandler implements ICommandHandler<UpdatePhotographerAiFaqCommand> {
  constructor(
    @InjectDataSource() private readonly lensDataSource: DataSource,
    @Inject(AI_DATABASE_DATA_SOURCE)
    private readonly aiDataSource: DataSource,
    private readonly ollama: OllamaClient,
  ) {}

  async execute(command: UpdatePhotographerAiFaqCommand): Promise<AiFaqRow> {
    const photographerId = await findPhotographerId(
      this.lensDataSource,
      command.actor.sub,
    );
    const currentRows: AiFaqRow[] = await this.aiDataSource.query(
      `SELECT id,
              question,
              answer,
              alternatives,
              is_active AS "isActive",
              updated_at AS "updatedAt"
         FROM ai_knowledge_items
        WHERE id = $1 AND photographer_id = $2`,
      [command.faqId, photographerId],
    );
    const current = currentRows[0];
    if (!current) throw new NotFoundException('FAQ not found');

    const question = command.patch.question?.trim() ?? current.question;
    const answer = command.patch.answer?.trim() ?? current.answer;
    if (!question || !answer) {
      throw new BadRequestException('Question and answer must not be blank');
    }
    const alternatives = normalizeAlternatives(
      command.patch.alternatives ?? current.alternatives,
    );
    const duplicates: Array<{ id: string }> = await this.aiDataSource.query(
      `SELECT id
         FROM ai_knowledge_items
        WHERE photographer_id = $1
          AND lower(question) = lower($2)
          AND id <> $3
        LIMIT 1`,
      [photographerId, question, command.faqId],
    );
    if (duplicates.length > 0) {
      throw new ConflictException('An FAQ with this question already exists');
    }

    const needsEmbedding =
      question !== current.question ||
      JSON.stringify(alternatives) !== JSON.stringify(current.alternatives);
    const embedding = needsEmbedding
      ? await createEmbedding(this.ollama, question, alternatives)
      : null;
    const rows: AiFaqRow[] = await this.aiDataSource.query(
      `UPDATE ai_knowledge_items
          SET question = $3,
              answer = $4,
              alternatives = $5,
              embedding = COALESCE($6::vector, embedding),
              embedding_model = COALESCE($7, embedding_model),
              is_active = $8,
              updated_at = now()
        WHERE id = $1 AND photographer_id = $2
        RETURNING id,
                  question,
                  answer,
                  alternatives,
                  is_active AS "isActive",
                  updated_at AS "updatedAt"`,
      [
        command.faqId,
        photographerId,
        question,
        answer,
        alternatives,
        embedding?.literal ?? null,
        embedding?.model ?? null,
        command.patch.isActive ?? current.isActive,
      ],
    );
    return rows[0];
  }
}

export class DeletePhotographerAiFaqCommand {
  constructor(
    public readonly actor: Actor,
    public readonly faqId: string,
  ) {}
}

@CommandHandler(DeletePhotographerAiFaqCommand)
export class DeletePhotographerAiFaqCommandHandler implements ICommandHandler<DeletePhotographerAiFaqCommand> {
  constructor(
    @InjectDataSource() private readonly lensDataSource: DataSource,
    @Inject(AI_DATABASE_DATA_SOURCE)
    private readonly aiDataSource: DataSource,
  ) {}

  async execute(command: DeletePhotographerAiFaqCommand): Promise<AiFaqRow> {
    const photographerId = await findPhotographerId(
      this.lensDataSource,
      command.actor.sub,
    );
    const rows: AiFaqRow[] = await this.aiDataSource.query(
      `UPDATE ai_knowledge_items
          SET is_active = false, updated_at = now()
        WHERE id = $1 AND photographer_id = $2
        RETURNING id,
                  question,
                  answer,
                  alternatives,
                  is_active AS "isActive",
                  updated_at AS "updatedAt"`,
      [command.faqId, photographerId],
    );
    if (!rows[0]) throw new NotFoundException('FAQ not found');
    return rows[0];
  }
}
