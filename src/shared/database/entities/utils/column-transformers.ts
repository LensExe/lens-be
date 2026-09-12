import type { ValueTransformer } from 'typeorm';

/**
 * Transformer chuyển đổi kiểu dữ liệu ngày giờ (Timestamp / Date)
 * giữa TypeORM Entity và Database.
 *
 * - `to(value)`: Được gọi khi GHI dữ liệu từ Entity xuống Database.
 *                Giữ nguyên giá trị truyền vào.
 *
 * - `from(value)`: Được gọi khi ĐỌC dữ liệu từ Database lên Entity.
 *   Nếu Database trả về một đối tượng Javascript `Date`,
 *   transformer này sẽ tự động chuyển thành chuỗi ISO8601 string.
 */
export const timestampTransformer: ValueTransformer = {
  to: (value: unknown) => value,
  from: (value: Date | string | null) =>
    value instanceof Date ? value.toISOString() : value,
};

/**
 * Cấu hình cột kiểu `bigint` kèm transformer tự động ép kiểu sang `number`
 *             trong JavaScript/TypeScript.
 *
 * Lý do cần thiết:
 * PostgreSQL lưu cột `bigint` (số nguyên 64-bit).
 * Driver `pg` mặc định trả về dữ liệu kiểu `string` (chuỗi)
 * để tránh bị tràn số an toàn của JavaScript (trên Number.MAX_SAFE_INTEGER).
 * Transformer này sẽ tự động parse chuỗi đó thành kiểu `number` tiện lợi khi tính toán trong mã nguồn.
 */
export const bigintColumn = {
  type: 'bigint' as const,
  transformer: {
    to: (value: unknown) => value,
    from: (value: string) => Number(value),
  } satisfies ValueTransformer,
};
