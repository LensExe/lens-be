// Explicit migration command. No automatic migration during application startup.
// Runs every migrations/NNN_<name>.sql file in name order, once. Other files (seed_*.sql) are ignored.
const { Client } = require('pg');
const { readFileSync, readdirSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { resolve } = require('node:path');
try {
  process.loadEnvFile?.();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const MIGRATIONS_DIR = resolve(__dirname, '../migrations');
const MIGRATION_FILE = /^\d{3}_[a-z0-9_-]+\.sql$/i;

/** Lists migration files as { name, sql, checksum }, sorted by file name. */
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

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5433),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(73651210)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS lens_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const { rows } = await client.query(
      'SELECT name, checksum FROM lens_migrations',
    );
    const applied = new Map(rows.map((row) => [row.name, row.checksum]));
    const ran = [];
    for (const migration of loadMigrations()) {
      const checksum = applied.get(migration.name);
      if (checksum !== undefined) {
        if (checksum !== migration.checksum)
          throw new Error(
            `Applied migration ${migration.name} changed; create a new migration`,
          );
        continue;
      }
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO lens_migrations(name,checksum) VALUES($1,$2)',
        [migration.name, migration.checksum],
      );
      ran.push(migration.name);
    }
    await client.query('COMMIT');
    console.log(
      ran.length
        ? `Applied ${ran.join(', ')}`
        : 'All migrations already applied',
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
