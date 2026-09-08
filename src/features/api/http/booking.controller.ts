import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BookingService } from '@modules/booking/application/services/booking.service';
import { CreateBookingDto } from '@modules/booking/application/dto/create-booking.dto';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingService.create(dto);
  }

  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.bookingService.findById(id);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.bookingService.confirm(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.bookingService.cancel(id);
  }
}
