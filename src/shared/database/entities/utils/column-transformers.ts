import type { ValueTransformer } from 'typeorm';

/**
 * Transformer for date and time values (Timestamp / Date)
 * between TypeORM entities and the database.
 *
 * - `to(value)`: Called when WRITING data from an entity to the database.
 * Return the input value unchanged.
 *
 * - `from(value)`: Called when READING data from the database into an entity.
 * If the database returns a JavaScript `Date` object,
 * this transformer converts it to an ISO 8601 string.
 */
export const timestampTransformer: ValueTransformer = {
  to: (value: unknown) => value,
  from: (value: Date | string | null) =>
    value instanceof Date ? value.toISOString() : value,
};

/**
 * Configure a `bigint` column with a transformer that converts values to `number`.
 *             trong JavaScript/TypeScript.
 *
 * Why this is needed:
 * PostgreSQL stores `bigint` columns as 64-bit integers.
 * The `pg` driver returns them as strings by default
 * to avoid exceeding JavaScript's safe integer limit (`Number.MAX_SAFE_INTEGER`).
 * This transformer parses the string into a convenient `number` for calculations in the application.
 */
export const bigintColumn = {
  type: 'bigint' as const,
  transformer: {
    to: (value: unknown) => value,
    from: (value: string) => Number(value),
  } satisfies ValueTransformer,
};
