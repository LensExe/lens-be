import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { UnitOfWork } from './unit-of-work.port';
import type { Session, Page } from './unit-of-work.port';
import {
  tableColumns,
  type EntityMap,
  type TableName,
} from '../records/records';
import { DomainError } from '../../platform/exceptions/domain.error';

// Identifiers come exclusively from the compiled schema allowlist; values are bound.
function quote(value: string) {
  return `"${value}"`;
}
export class PostgresSession implements Session {
  constructor(private readonly manager: EntityManager) {}
  private column(table: TableName, key: string) {
    if (!tableColumns[table]?.includes(key))
      throw new Error(`Unknown column ${table}.${key}`);
    return quote(key);
  }
  async get<K extends TableName>(table: K, id: string) {
    return (await this.find(table, { id } as Partial<EntityMap[K]>))[0] ?? null;
  }
  async find<K extends TableName>(
    table: K,
    where: Partial<EntityMap[K]> = {},
    page: Page = {},
  ): Promise<EntityMap[K][]> {
    const values: unknown[] = [];
    const conditions = Object.entries(where).map(([k, v]) =>
      v === null
        ? `${this.column(table, k)} IS NULL`
        : `${this.column(table, k)} = $${values.push(v)}`,
    );
    const order = this.column(table, page.order ?? 'created_at');
    return this.manager
      .query(
        `SELECT * FROM ${quote(table)}${conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''} ORDER BY ${order} ${page.descending ? 'DESC' : 'ASC'}, id ASC${page.limit !== undefined ? ` LIMIT $${values.push(page.limit)}` : ''}${page.offset !== undefined ? ` OFFSET $${values.push(page.offset)}` : ''}`,
        values,
      )
      .then((rows) => rows.map(normalize));
  }
  async insert<K extends TableName>(
    table: K,
    data: Partial<EntityMap[K]>,
  ): Promise<EntityMap[K]> {
    const entries = Object.entries({ id: randomUUID(), ...data }).filter(
      ([, v]) => v !== undefined,
    );
    const [row] = await this.manager.query(
      `INSERT INTO ${quote(table)} (${entries.map(([k]) => this.column(table, k)).join(',')}) VALUES (${entries.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`,
      entries.map(([, v]) =>
        Array.isArray(v) || (v && typeof v === 'object')
          ? JSON.stringify(v)
          : v,
      ),
    );
    return normalize(row as Record<string, unknown>);
  }
  async update<K extends TableName>(
    table: K,
    id: string,
    data: Partial<EntityMap[K]>,
  ): Promise<EntityMap[K]> {
    const entries = Object.entries({
      ...data,
      updated_at: new Date().toISOString(),
    }).filter(([k, v]) => k !== 'id' && k !== 'created_at' && v !== undefined);
    const result = await this.manager.query(
      `UPDATE ${quote(table)} SET ${entries.map(([k], i) => `${this.column(table, k)}=$${i + 1}`).join(',')} WHERE id=$${entries.length + 1} RETURNING *`,
      [
        ...entries.map(([, v]) =>
          Array.isArray(v) || (v && typeof v === 'object')
            ? JSON.stringify(v)
            : v,
        ),
        id,
      ],
    );
    // TypeORM's PostgreSQL UPDATE result is [rows, affectedCount].
    const row = Array.isArray(result[0]) ? result[0][0] : result[0];
    if (!row) throw new DomainError('missing', `${table} not found`);
    return normalize(row as Record<string, unknown>);
  }
  async delete(table: TableName, id: string) {
    await this.manager.query(`DELETE FROM ${quote(table)} WHERE id=$1`, [id]);
  }
}
function normalize(row: Record<string, any>): any {
  const numeric = new Set([
    'price',
    'amount',
    'balance',
    'frozen_balance',
    'deposit_amount',
    'total_amount',
    'provider_order_code',
    'file_size',
    'average_rating',
  ]);
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      v instanceof Date
        ? v.toISOString()
        : numeric.has(k) && v !== null
          ? Number(v)
          : v,
    ]),
  );
}
@Injectable()
export class PostgresUnitOfWork extends UnitOfWork {
  constructor(private readonly dataSource: DataSource) {
    super();
  }
  read<T>(work: (s: Session) => Promise<T>) {
    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      await manager.query('SET TRANSACTION READ ONLY');
      return work(new PostgresSession(manager));
    });
  }
  async write<T>(work: (s: Session) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Cross-instance serialization: booking overlap, payment and ownership checks
        // share one transaction. Replace with aggregate locks when scaling throughput.
        await manager.query('SELECT pg_advisory_xact_lock(73651209)');
        return work(new PostgresSession(manager));
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505')
        throw new DomainError('conflict', 'Resource already exists');
      if (code === '23503')
        throw new DomainError(
          'conflict',
          'Referenced resource is missing or still in use',
        );
      if (code === '23514')
        throw new DomainError(
          'invalid',
          'Database constraint rejected the value',
        );
      throw error;
    }
  }
}
