// Explicit migration command. No automatic migration during application startup.
const { Client } = require('pg');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { resolve } = require('node:path');
try {
  process.loadEnvFile?.();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
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
    const sql = readFileSync(
      resolve(__dirname, '../migrations/001_lens.sql'),
      'utf8',
    );
    const checksum = createHash('sha256').update(sql).digest('hex');
    const { rows } = await client.query(
      'SELECT checksum FROM lens_migrations WHERE name=$1',
      ['001_lens'],
    );
    if (rows.length) {
      if (rows[0].checksum !== checksum)
        throw new Error(
          'Applied migration checksum changed; create a new migration',
        );
    } else {
      await client.query(sql);
      await client.query(
        'INSERT INTO lens_migrations(name,checksum) VALUES($1,$2)',
        ['001_lens', checksum],
      );
    }
    await client.query('COMMIT');
    console.log(rows.length ? 'Migration already applied' : 'Applied 001_lens');
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
