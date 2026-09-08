import { Controller, Get, Param } from '@nestjs/common';
import { FeedbackService } from '@modules/feedback/application/services/feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  findAll() {
    return this.feedbackService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.feedbackService.findById(id);
  }

  @Get('booking/:bookingId')
  findByBookingId(@Param('bookingId') bookingId: string) {
    return this.feedbackService.findByBookingId(bookingId);
  }
}
