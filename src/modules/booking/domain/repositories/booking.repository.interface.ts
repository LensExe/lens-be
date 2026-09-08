import { BookingDomainEntity } from '../entities/booking.domain-entity';

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');

export interface IBookingRepository {
  findById(id: string): Promise<BookingDomainEntity | null>;
  findAll(): Promise<BookingDomainEntity[]>;
  save(booking: BookingDomainEntity): Promise<BookingDomainEntity>;
  delete(id: string): Promise<void>;
}
