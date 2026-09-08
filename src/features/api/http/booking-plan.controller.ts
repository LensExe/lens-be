import { Controller, Get, Param } from '@nestjs/common';
import { BookingPlanService } from '@modules/booking-plan/application/services/booking-plan.service';

@Controller('booking-plan')
export class BookingPlanController {
  constructor(private readonly bookingPlanService: BookingPlanService) {}

  @Get()
  findAll() {
    return this.bookingPlanService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.bookingPlanService.findById(id);
  }
}
