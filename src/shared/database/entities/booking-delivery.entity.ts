import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Entity representing the `booking_deliveries` table.
 * Stores the list of image and video files delivered by a photographer to a customer for a booking.
 */
@Entity('booking_deliveries')
export class BookingDeliveryEntity extends BaseEntity {
  /** ID of the associated booking (foreign key referencing `bookings.id`). */
  @Column('uuid')
  booking_id!: string;

  /** Delivery batch name (for example, 'Original JPEGs' or 'Retouched photos'). */
  @Column({ default: 'Bàn giao ảnh' })
  title!: string;

  /**
   * LIST OF IDS FOR THE DELIVERED MEDIA FILES (UUID array).
   */
  @Column('jsonb', { default: [] })
  media_ids!: string[];
}
