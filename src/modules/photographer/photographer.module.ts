import { Module } from '@nestjs/common';
import { PhotographerService } from './application/services/photographer.service';
import { ScheduleService } from './application/services/schedule.service';
import { PHOTOGRAPHER_REPOSITORY } from './domain/repositories/photographer.repository.interface';
import { PhotographerRepository } from './infrastructure/repositories/photographer.repository';
import { PROFILE_REPOSITORY } from './domain/repositories/profile.repository.interface';
import { ProfileRepository } from './infrastructure/repositories/profile.repository';
import { RATING_REPOSITORY } from './domain/repositories/rating.repository.interface';
import { RatingRepository } from './infrastructure/repositories/rating.repository';
import { WORKING_SLOT_REPOSITORY } from './domain/repositories/working-slot.repository.interface';
import { WorkingSlotRepository } from './infrastructure/repositories/working-slot.repository';
import { OFFLINE_SLOT_REPOSITORY } from './domain/repositories/offline-slot.repository.interface';
import { OfflineSlotRepository } from './infrastructure/repositories/offline-slot.repository';

@Module({
  imports: [],
  providers: [
    PhotographerService,
    ScheduleService,
    {
      provide: PHOTOGRAPHER_REPOSITORY,
      useClass: PhotographerRepository,
    },
    {
      provide: PROFILE_REPOSITORY,
      useClass: ProfileRepository,
    },
    {
      provide: RATING_REPOSITORY,
      useClass: RatingRepository,
    },
    {
      provide: WORKING_SLOT_REPOSITORY,
      useClass: WorkingSlotRepository,
    },
    {
      provide: OFFLINE_SLOT_REPOSITORY,
      useClass: OfflineSlotRepository,
    },
  ],
  exports: [PhotographerService, ScheduleService],
})
export class PhotographerModule {}
