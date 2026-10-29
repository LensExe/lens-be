// Provisions the dedicated AI database when needed, then applies its migrations once.
const { Client } = require('pg');
const { readFileSync, readdirSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { resolve } = require('node:path');

try {
  process.loadEnvFile?.();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const MIGRATIONS_DIR = resolve(__dirname, '../migrations/ai');
const MIGRATION_FILE = /^\d{3}_[a-z0-9_-]+\.sql$/i;
const AI_DATABASE_URL = process.env.AI_DATABASE_URL;
const URL_DATABASE = AI_DATABASE_URL
  ? decodeURIComponent(new URL(AI_DATABASE_URL).pathname.replace(/^\/+/, ''))
  : '';
const AI_DATABASE = (process.env.AI_DB_NAME ?? URL_DATABASE) || 'lens_ai';
const AI_USERNAME =
  process.env.AI_DB_USERNAME ??
  process.env.DB_USERNAME ??
  (AI_DATABASE_URL
    ? decodeURIComponent(new URL(AI_DATABASE_URL).username)
    : 'lens-postgres');

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function loadMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => MIGRATION_FILE.test(file))
    .sort()
    .map((file) => {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
      return {
        name: file.replace(/\.sql$/, ''),
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    });
}

function connectionConfig(database) {
  if (AI_DATABASE_URL) {
    const url = new URL(AI_DATABASE_URL);
    url.pathname = `/${encodeURIComponent(database)}`;
    return { connectionString: url.toString() };
  }

  return {
    host: process.env.AI_DB_HOST ?? process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.AI_DB_PORT ?? process.env.DB_PORT ?? 5433),
    user: AI_USERNAME ?? 'lens-postgres',
    password: process.env.AI_DB_PASSWORD ?? process.env.DB_PASSWORD,
    database,
  };
}

async function ensureAiDatabase() {
  if (!/^[a-zA-Z0-9_]+$/.test(AI_DATABASE)) {
    throw new Error(
      'AI_DB_NAME may contain only letters, numbers, and underscores',
    );
  }

  const adminDatabase = process.env.AI_DB_ADMIN_NAME ?? 'postgres';
  const admin = new Client(connectionConfig(adminDatabase));
  await admin.connect();
  try {
    const { rows } = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [AI_DATABASE],
    );
    if (rows.length === 0) {
      const owner = AI_USERNAME ?? 'lens-postgres';
      await admin.query(
        `CREATE DATABASE ${quoteIdentifier(AI_DATABASE)} OWNER ${quoteIdentifier(owner)}`,
      );
      console.log(`Created PostgreSQL database ${AI_DATABASE}`);
    }
  } finally {
    await admin.end();
  }
}

async function main() {
  const migrations = loadMigrations();
  if (migrations.length === 0) {
    throw new Error(`No numbered AI migrations found in ${MIGRATIONS_DIR}`);
  }

  await ensureAiDatabase();
  const client = new Client(connectionConfig(AI_DATABASE));
  await client.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(73651211)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS lens_ai_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const { rows } = await client.query(
      'SELECT name, checksum FROM lens_ai_migrations',
    );
    const applied = new Map(rows.map((row) => [row.name, row.checksum]));
    const ran = [];
    for (const migration of migrations) {
      const checksum = applied.get(migration.name);
      if (checksum !== undefined) {
        if (checksum !== migration.checksum) {
          throw new Error(
            `Applied AI migration ${migration.name} changed; create a new migration`,
          );
        }
        continue;
      }
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO lens_ai_migrations(name,checksum) VALUES($1,$2)',
        [migration.name, migration.checksum],
      );
      ran.push(migration.name);
    }
    await client.query('COMMIT');
    console.log(
      ran.length
        ? `Applied AI migrations ${ran.join(', ')}`
        : 'All AI migrations already applied',
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
