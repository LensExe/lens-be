import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserStatus, type Gender } from '@shared/domain/values/user.values';

/**
 * Entity representing the `users` table.
 * Core user account table for the Lens Backend system.
 */
@Entity('users')
export class UserEntity extends BaseEntity {
  /** User ID in Keycloak (unique key used to authenticate JWTs). */
  @Column({ unique: true })
  keycloak_id!: string;

  /** User's full name. */
  @Column()
  fullname!: string;

  /** User email address. */
  @Column()
  email!: string;

  /** Contact phone number. */
  @Column('text', { nullable: true })
  phone_number!: string | null;

  /** Profile image URL. */
  @Column('text', { nullable: true })
  avatar_url!: string | null;

  /** User gender ('male' | 'female' | 'other'). */
  @Column('text', { nullable: true })
  gender!: Gender | null;

  /** Date of birth (YYYY-MM-DD format). */
  @Column({ type: 'date', nullable: true })
  dob!: string | null;

  /** User account status ('active' | 'suspended' | 'banned' | 'inactive'). */
  @Column({ default: UserStatus.INACTIVE })
  status!: UserStatus;
}
