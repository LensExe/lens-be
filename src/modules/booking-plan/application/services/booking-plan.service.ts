import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BOOKING_PLAN_REPOSITORY } from '../../domain/repositories/booking-plan.repository.interface';
import type { IBookingPlanRepository } from '../../domain/repositories/booking-plan.repository.interface';

@Injectable()
export class BookingPlanService {
  constructor(
    @Inject(BOOKING_PLAN_REPOSITORY)
    private readonly bookingPlanRepository: IBookingPlanRepository,
  ) {}

  async findAll() {
    return this.bookingPlanRepository.findAll();
  }

  async findById(id: string) {
    const plan = await this.bookingPlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Booking plan with ID "${id}" not found.`);
    }
    return plan;
  }
}
