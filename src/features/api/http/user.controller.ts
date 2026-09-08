import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UserService } from '@modules/user/application/services/user.service';
import { UpdateUserDto } from '@modules/user/application/dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Get('keycloak/:keycloakId')
  findByKeycloakId(@Param('keycloakId') keycloakId: string) {
    return this.userService.findByKeycloakId(keycloakId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Patch(':id/ban')
  ban(@Param('id') id: string) {
    return this.userService.ban(id);
  }
}
