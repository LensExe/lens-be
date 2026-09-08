import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { PhotographerService } from '@modules/photographer/application/services/photographer.service';
import { ScheduleService } from '@modules/photographer/application/services/schedule.service';

@Controller('photographer')
export class PhotographerController {
  constructor(
    private readonly photographerService: PhotographerService,
    private readonly scheduleService: ScheduleService,
  ) {}

  @Get()
  findAll() {
    return this.photographerService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.photographerService.findById(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.photographerService.approve(id, adminId);
  }

  @Get(':id/working-slots')
  getWorkingSlots(@Param('id') id: string) {
    return this.scheduleService.getWorkingSlots(id);
  }

  @Get(':id/offline-slots')
  getOfflineSlots(@Param('id') id: string) {
    return this.scheduleService.getOfflineSlots(id);
  }

  @Delete('working-slot/:slotId')
  deleteWorkingSlot(@Param('slotId') slotId: string) {
    return this.scheduleService.deleteWorkingSlot(slotId);
  }

  @Delete('offline-slot/:slotId')
  deleteOfflineSlot(@Param('slotId') slotId: string) {
    return this.scheduleService.deleteOfflineSlot(slotId);
  }
}
