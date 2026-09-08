import { Module } from '@nestjs/common';
import { BookingModule } from '@modules/booking/booking.module';
import { UserModule } from '@modules/user/user.module';
import { PhotographerModule } from '@modules/photographer/photographer.module';
import { BookingPlanModule } from '@modules/booking-plan/booking-plan.module';
import { FeedbackModule } from '@modules/feedback/feedback.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { SubscriptionModule } from '@modules/subscription/subscription.module';

import { BookingController } from './http/booking.controller';
import { UserController } from './http/user.controller';
import { PhotographerController } from './http/photographer.controller';
import { BookingPlanController } from './http/booking-plan.controller';
import { FeedbackController } from './http/feedback.controller';
import { WalletController } from './http/wallet.controller';
import { SubscriptionController } from './http/subscription.controller';

@Module({
  imports: [
    BookingModule,
    UserModule,
    PhotographerModule,
    BookingPlanModule,
    FeedbackModule,
    WalletModule,
    SubscriptionModule,
  ],
  controllers: [
    BookingController,
    UserController,
    PhotographerController,
    BookingPlanController,
    FeedbackController,
    WalletController,
    SubscriptionController,
  ],
  exports: [],
})
export class ApiModule {}
