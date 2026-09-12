import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Actor } from '@shared/platform/auth/actor';
import { Registration } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import { IdentityRegisterCommand } from '@modules/identity/identity.command';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(private readonly commands: CommandBus) {}

  @Post('auth/register')
  @ApiOperation({
    operationId: 'AUTH-001',
    summary: 'Đăng ký tài khoản',
    description:
      'Tạo hồ sơ người dùng sau khi đăng ký/xác thực qua IdP. Role: Public',
  })
  @Registration()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: Dto.AuthRegisterCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('AUTH-001'),
  })
  @HttpCode(200)
  register(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.AuthRegisterCommandBodyDto,
  ) {
    return this.commands.execute(
      new IdentityRegisterCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }
}
