import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../domain/repositories/booking.repository.interface';
import type { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { BookingDomainEntity } from '../../domain/entities/booking.domain-entity';
import { BookingStatus } from '../../domain/enums/booking-status.enum';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { BookingResponseDto } from '../dto/booking-response.dto';

@Injectable()
export class BookingService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async create(dto: CreateBookingDto): Promise<BookingResponseDto> {
    const booking = new BookingDomainEntity({
      id: Math.random().toString(36).substring(2, 9),
      userId: dto.userId,
      lensId: dto.lensId,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      status: BookingStatus.PENDING,
    });

    const saved = await this.bookingRepository.save(booking);
    return BookingResponseDto.fromDomain(saved);
  }

  async findAll(): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingRepository.findAll();
    return bookings.map((item) => BookingResponseDto.fromDomain(item));
  }

  async findById(id: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found.`);
    }
    return BookingResponseDto.fromDomain(booking);
  }

  async confirm(id: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found.`);
    }
    booking.confirm();
    const updated = await this.bookingRepository.save(booking);
    return BookingResponseDto.fromDomain(updated);
  }

  async cancel(id: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found.`);
    }
    booking.cancel();
    const updated = await this.bookingRepository.save(booking);
    return BookingResponseDto.fromDomain(updated);
  }
}
