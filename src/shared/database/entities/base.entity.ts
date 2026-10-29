import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { timestampTransformer } from './utils/column-transformers';

/**
 * BaseEntity is the abstract base class for all database entities.
 * Automatically provides three standard fields:
 * - `id`: Auto-generated UUID primary key.
 * - `created_at`: Record creation time (normalized to an ISO string by `timestampTransformer`).
 * - `updated_at`: Time the record was last updated.
 */
export abstract class BaseEntity {
  /** Unique UUID v4 primary key for the record. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Time when the record was created in the database. */
  @CreateDateColumn({
    type: 'timestamptz',
    transformer: timestampTransformer,
  })
  created_at!: string;

  /** Time when the record was last updated. */
  @UpdateDateColumn({
    type: 'timestamptz',
    transformer: timestampTransformer,
  })
  updated_at!: string;
}
