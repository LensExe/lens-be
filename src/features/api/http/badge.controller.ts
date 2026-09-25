import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import type { Actor } from '@shared/platform/auth/actor';
import { Access, Public } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import { BadgeUpdateCommand } from '@modules/photographer/badges.command';
import { BadgeListQuery } from '@modules/photographer/badges.query';

@ApiTags('Badge')
@Controller()
export class BadgeController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get('badges')
  @ApiOperation({
    operationId: 'PHO-015',
    summary: 'Danh sách huy hiệu thợ',
    description:
      'Tên hiển thị, mô tả và điều kiện của các huy hiệu thợ. Role: Public',
  })
  @Public()
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
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PHO-015'),
  })
  list(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new BadgeListQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  @Patch('admin/badges/:code')
  @ApiOperation({
    operationId: 'ADM-012',
    summary: 'Sửa huy hiệu thợ',
    description:
      'Admin sửa tên, mô tả, ngưỡng, số review tối thiểu hoặc bật/tắt một huy hiệu. Role: Admin',
  })
  @Access(['admin'])
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
  @ApiParam({ name: 'code', type: String, description: 'Badge code' })
  @ApiBody({ type: Dto.BadgeUpdateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-012'),
  })
  update(
    @Req() req: { actor?: Actor },
    @Param('code') code: string,
    @Body() body: Dto.BadgeUpdateCommandBodyDto,
  ) {
    return this.commands.execute(
      new BadgeUpdateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        code,
      }),
    );
  }
}
