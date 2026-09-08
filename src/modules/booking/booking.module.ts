import { Module } from '@nestjs/common';
import { BookingService } from './application/services/booking.service';
import { BOOKING_REPOSITORY } from './domain/repositories/booking.repository.interface';
import { BookingRepository } from './infrastructure/repositories/booking.repository';

@Module({
  imports: [],
  providers: [
    BookingService,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
  ],
  exports: [BookingService],
})
export class BookingModule {}
