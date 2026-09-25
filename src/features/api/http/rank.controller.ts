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
import { RankUpdateCommand } from '@modules/photographer/ranks.command';
import { RankListQuery } from '@modules/photographer/ranks.query';

@ApiTags('Rank')
@Controller()
export class RankController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get('ranks')
  @ApiOperation({
    operationId: 'PHO-014',
    summary: 'Danh sách hạng thợ',
    description:
      'Tên hiển thị, mốc số buổi và % commission của các hạng thợ. Role: Public',
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
    schema: responseSchema('PHO-014'),
  })
  list(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new RankListQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  @Patch('admin/ranks/:code')
  @ApiOperation({
    operationId: 'ADM-011',
    summary: 'Sửa hạng thợ',
    description:
      'Admin sửa tên, mốc số buổi hoàn tất và % commission của một hạng. Role: Admin',
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
  @ApiParam({ name: 'code', type: String, description: 'Rank code' })
  @ApiBody({ type: Dto.RankUpdateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-011'),
  })
  update(
    @Req() req: { actor?: Actor },
    @Param('code') code: string,
    @Body() body: Dto.RankUpdateCommandBodyDto,
  ) {
    return this.commands.execute(
      new RankUpdateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        code,
      }),
    );
  }
}
