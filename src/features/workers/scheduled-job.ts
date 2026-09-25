import type { DataSource } from 'typeorm';
import type { Actor } from '@shared/platform/auth/actor';

/** Actor dùng khi job nền gọi command/query: role `system`, không gắn với user nào. */
export const SYSTEM_ACTOR: Actor = { sub: 'system', roles: ['system'] };

/**
 * Chạy `job` nếu không instance nào khác đang chạy job cùng tên.
 *
 * Dùng Postgres advisory lock theo session nên an toàn khi app chạy nhiều instance.
 * Trả `false` khi bỏ qua vì nơi khác đang chạy. Lock luôn được nhả, kể cả khi job lỗi.
 *
 * Cách dùng: trong một method gắn decorator `Cron` của `@nestjs/schedule`, gọi
 * `runExclusive(this.dataSource, 'booking.auto-complete', () => this.commands.execute(cmd))`
 * với `cmd` là command tạo bằng `SYSTEM_ACTOR`. Luật nghiệp vụ vẫn nằm trong use case.
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
