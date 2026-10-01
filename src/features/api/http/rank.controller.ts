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
import { RankUpdateCommand } from '@modules/photographer/rank/ranks.command';
import { RankListQuery } from '@modules/photographer/rank/ranks.query';

@ApiTags('Rank')
@Controller()
export class RankController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  /**
   * List ranks using the supplied query filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @returns Result of the query dispatched to its handler.
   */
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

  /**
   * Update rank criteria and rank details.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param code Business or configuration code to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
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
