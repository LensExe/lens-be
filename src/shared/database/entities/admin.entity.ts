import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity representing the `admins` table.
 * Stores user profiles with the system administrator role.
 */
@Entity('admins')
export class AdminEntity extends BaseEntity {
  /** User ID (foreign key referencing `users.id`). */
  @Column('uuid', { unique: true })
  user_id!: string;

  /** Whether administrator privileges are active. */
  @Column({ default: true })
  is_active!: boolean;
}
