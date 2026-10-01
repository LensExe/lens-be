import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import type { PhotographyStyle } from '@shared/domain/values/photography-style.values';

/**
 * Entity representing the `customers` table.
 * Stores supplementary profile information for users acting as customers (people hiring photographers).
 */
@Entity('customers')
export class CustomerEntity extends BaseEntity {
  /** User ID (unique foreign key referencing `users.id`). */
  @Column('uuid', { unique: true })
  user_id!: string;

  /** Short customer introduction or photography needs. */
  @Column('text', { nullable: true })
  description!: string | null;

  /** List of preferred photography styles used to recommend suitable photographers. */
  @Column('jsonb', {
    default: () => "'[]'::jsonb",
  })
  preferred_styles!: PhotographyStyle[];

  /** The customer's location, service area, or place of residence. */
  @Column('text', { nullable: true })
  location!: string | null;
}
