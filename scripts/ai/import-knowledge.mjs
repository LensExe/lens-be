#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

const EMBEDDING_DIMENSIONS = 1024;

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error('Usage: pnpm ai:import-knowledge path/to/knowledge.json');
  }

  const records = JSON.parse(await readFile(inputPath, 'utf8'));
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('Knowledge input must be a non-empty JSON array');
  }

  const embeddingModel =
    process.env.AI_EMBEDDING_MODEL ?? 'qwen3-embedding:0.6b';
  const ollamaBaseUrl = (
    process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  ).replace(/\/$/, '');
  const parsed = records.map(validateRecord);
  const vectors = await createEmbeddings(
    ollamaBaseUrl,
    embeddingModel,
    parsed.map((record) =>
      [record.question, ...record.alternatives].filter(Boolean).join('\n'),
    ),
  );

  const client = new Client(databaseConfig());
  await client.connect();
  try {
    await client.query('BEGIN');
    for (let index = 0; index < parsed.length; index += 1) {
      const record = parsed[index];
      const vector = vectors[index];
      await client.query(
        `INSERT INTO ai_knowledge_items (
           photographer_id,
           question,
           answer,
           alternatives,
           embedding,
           embedding_model,
           is_active,
           updated_at
         ) VALUES ($1, $2, $3, $4, $5::vector, $6, true, now())
         ON CONFLICT (photographer_id, question) DO UPDATE SET
           answer = EXCLUDED.answer,
           alternatives = EXCLUDED.alternatives,
           embedding = EXCLUDED.embedding,
           embedding_model = EXCLUDED.embedding_model,
           is_active = true,
           updated_at = now()`,
        [
          record.photographerId,
          record.question,
          record.answer,
          record.alternatives,
          `[${vector.join(',')}]`,
          embeddingModel,
        ],
      );
    }
    await client.query('COMMIT');
    console.log(`Imported ${parsed.length} knowledge item(s)`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

function validateRecord(value, index) {
  if (!value || typeof value !== 'object') {
    throw new Error(`Knowledge item ${index + 1} must be an object`);
  }
  const photographerId = String(value.photographerId ?? '').trim();
  const question = String(value.question ?? '').trim();
  const answer = String(value.answer ?? '').trim();
  const alternatives = value.alternatives ?? [];
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      photographerId,
    ) ||
    !question ||
    !answer ||
    !Array.isArray(alternatives) ||
    alternatives.some((item) => typeof item !== 'string')
  ) {
    throw new Error(
      `Knowledge item ${index + 1} needs a valid photographerId, question, answer, and string alternatives[]`,
    );
  }
  return {
    photographerId,
    question,
    answer,
    alternatives: alternatives.map((item) => item.trim()).filter(Boolean),
  };
}

async function createEmbeddings(baseUrl, model, inputs) {
  const response = await fetch(`${baseUrl}/api/embed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      input: inputs,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(
      `Ollama embedding request failed with HTTP ${response.status}`,
    );
  }
  const body = await response.json();
  const vectors = body.embeddings;
  if (
    !Array.isArray(vectors) ||
    vectors.length !== inputs.length ||
    vectors.some(
      (vector) =>
        !Array.isArray(vector) ||
        vector.length !== EMBEDDING_DIMENSIONS ||
        vector.some((number) => !Number.isFinite(number)),
    )
  ) {
    throw new Error(
      `Ollama must return ${inputs.length} vectors of 1024 dimensions`,
    );
  }
  return vectors;
}

function databaseConfig() {
  if (process.env.AI_DATABASE_URL) {
    return { connectionString: process.env.AI_DATABASE_URL };
  }
  return {
    host: process.env.AI_DB_HOST ?? process.env.DB_HOST ?? 'localhost',
    port: Number.parseInt(
      process.env.AI_DB_PORT ?? process.env.DB_PORT ?? '5433',
      10,
    ),
    user:
      process.env.AI_DB_USERNAME ?? process.env.DB_USERNAME ?? 'lens-postgres',
    password: process.env.AI_DB_PASSWORD ?? process.env.DB_PASSWORD,
    database: process.env.AI_DB_NAME ?? 'lens_ai',
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
