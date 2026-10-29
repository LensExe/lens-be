import type { DataSource } from 'typeorm';
import type { Actor } from '@shared/platform/auth/actor';

/** Actor used when a background job sends a command or query: `system` role, not linked to a user. */
export const SYSTEM_ACTOR: Actor = { sub: 'system', roles: ['system'] };

/**
 * Run `job` only if no other instance is running a job with the same name.
 *
 * Uses a Postgres session-level advisory lock, so it is safe when the app runs on multiple instances.
 * Returns `false` when another instance is already running. Always release the lock, even if the job fails.
 *
 * Usage: call this from a method decorated with `Cron` from `@nestjs/schedule`,
 * `runExclusive(this.dataSource, 'booking.auto-complete', () => this.commands.execute(cmd))`
 * with `cmd` set to a command created using `SYSTEM_ACTOR`. Business rules remain in the use case.
 *
 * @param dataSource Data source used to open a transaction.
 * @param jobName String value used by the operation: job name.
 * @param job Value used by the operation: job.
 * @returns Boolean indicating the result of the check or operation.
 */
export async function runExclusive(
  dataSource: DataSource,
  jobName: string,
  job: () => Promise<unknown>,
): Promise<boolean> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    const [{ locked }] = (await runner.query(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
      [jobName],
    )) as { locked: boolean }[];
    if (!locked) return false;
    try {
      await job();
    } finally {
      await runner.query('SELECT pg_advisory_unlock(hashtext($1))', [jobName]);
    }
    return true;
  } finally {
    await runner.release();
  }
}
