import { BookingPlanDomainEntity } from '../entities/booking-plan.domain-entity';

export const BOOKING_PLAN_REPOSITORY = Symbol('BOOKING_PLAN_REPOSITORY');

export interface IBookingPlanRepository {
  findById(id: string): Promise<BookingPlanDomainEntity | null>;
  findByCode(code: string): Promise<BookingPlanDomainEntity | null>;
  findAll(): Promise<BookingPlanDomainEntity[]>;
  save(plan: BookingPlanDomainEntity): Promise<BookingPlanDomainEntity>;
  delete(id: string): Promise<void>;
}
