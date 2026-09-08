import { Controller, Get, Param } from '@nestjs/common';
import { SubscriptionService } from '@modules/subscription/application/services/subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  findAll() {
    return this.subscriptionService.findAll();
  }

  @Get('photographer/:photographerId')
  findByPhotographerId(@Param('photographerId') photographerId: string) {
    return this.subscriptionService.findByPhotographerId(photographerId);
  }
}
