import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { timestampTransformer } from './utils/column-transformers';
import { VerificationStatus } from '@shared/domain/values/photographer.values';
import type { VerificationStatus as VerificationStatusType } from '@shared/domain/values/photographer.values';
import type { PhotographyStyle } from '@shared/domain/values/photography-style.values';

/**
 * Entity representing the `photographers` table.
 * Stores photographers' professional profile and review status.
 */
@Entity('photographers')
export class PhotographerEntity extends BaseEntity {
  /** User ID (unique foreign key referencing `users.id`). */
  @Column('uuid', { unique: true })
  user_id!: string;

  /** Photographer's personal or business tax ID, if available. */
  @Column('text', { nullable: true })
  tax_code!: string | null;

  /** List of photography styles (for example, portrait, yearbook, events, weddings, or outdoor shoots). */
  @Column('jsonb', { default: () => "'[]'::jsonb" })
  styles!: PhotographyStyle[];

  /** Year the photographer started working professionally. */
  @Column({ type: 'int', nullable: true })
  started_career_at!: number | null;

  /** Photographer's primary service area or city. */
  @Column({ default: '' })
  location!: string;

  /** Introduction to the photographer, working style, and services. */
  @Column({ default: '' })
  description!: string;

  /** Administrative verification status of the professional profile. */
  @Column({ default: VerificationStatus.PENDING })
  verification_status!: VerificationStatusType;

  /** Boolean approval flag (`true` when `verification_status` is 'verified'). */
  @Column({ default: false })
  is_verified!: boolean;

  /** ID of the admin who approved this photographer profile. */
  @Column('uuid', { nullable: true })
  approved_by!: string | null;

  /** Reason an admin rejected the profile (`null` if it has not been rejected or has been resubmitted). */
  @Column('text', { nullable: true })
  rejection_reason!: string | null;

  /** Time of the admin's most recent approval or rejection. */
  @Column('timestamptz', { nullable: true, transformer: timestampTransformer })
  reviewed_at!: string | null;

  /** Whether the photographer is available to accept bookings. */
  @Column({ default: true })
  is_available!: boolean;
}
