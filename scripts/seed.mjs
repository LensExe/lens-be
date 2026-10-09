#!/usr/bin/env node
/** Run the reviewed SQL fixture against a Lens database. Remote hosts require explicit opt-in. */

import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  process.loadEnvFile?.();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const databaseHost = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).hostname.replace(/^\[|\]$/g, '')
  : process.env.DB_HOST || 'localhost';
const normalizedDatabaseHost = databaseHost.toLowerCase();
const localHosts = new Set(['localhost', '127.0.0.1', '::1', 'lens-postgres']);

if (
  !localHosts.has(normalizedDatabaseHost) &&
  process.env.ALLOW_NONLOCAL_SEED !== 'true'
) {
  throw new Error(
    `Refusing to seed database host "${databaseHost}". Set ALLOW_NONLOCAL_SEED=true only when that is intentional.`,
  );
}

const clientConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5433),
      user: process.env.DB_USERNAME || 'lens-postgres',
      password: process.env.DB_PASSWORD || 'Postgres@#_Lens_EXE202_FPT_FA26',
      database: process.env.DB_NAME || 'lens',
    };
const client = new Client(clientConfig);
const sql = readFileSync(
  resolve(__dirname, '../migrations/seed_lens-reviewed.sql'),
  'utf8',
);

try {
  await client.connect();
  await client.query(sql);
  console.log('Loaded migrations/seed_lens-reviewed.sql successfully.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(`Database seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
