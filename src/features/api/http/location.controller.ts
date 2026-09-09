import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Req,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
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
import type { Actor } from '@shared/database/unit-of-work/unit-of-work.port';
import { Access } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../responses';
import { LocationStartCommand } from '@modules/location/application/commands/location';
import { LocationStopCommand } from '@modules/location/application/commands/location';
import { LocationUpdateCommand } from '@modules/location/application/commands/location';
import { LocationGetQuery } from '@modules/location/application/queries/location';

@ApiTags('Location')
@Controller()
export class LocationController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
  @Post('bookings/:id/location/start')
  @ApiOperation({
    operationId: 'LOC-001',
    summary: 'Bắt đầu chia sẻ vị trí',
    description:
      'Bật phiên tracking trong thời gian hợp lệ. Role: Photographer',
  })
  @Access(['photographer'])
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('LOC-001'),
  })
  @HttpCode(200)
  start(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new LocationStartCommand(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Post('bookings/:id/location/stop')
  @ApiOperation({
    operationId: 'LOC-004',
    summary: 'Dừng chia sẻ vị trí',
    description: 'Kết thúc phiên tracking. Role: Photographer/System',
  })
  @Access(['system', 'photographer'])
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('LOC-004'),
  })
  @HttpCode(200)
  stop(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new LocationStopCommand(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Post('bookings/:id/location/update')
  @ApiOperation({
    operationId: 'LOC-002',
    summary: 'Cập nhật vị trí',
    description: 'Gửi vị trí hiện tại trong phiên tracking. Role: Photographer',
  })
  @Access(['photographer'])
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiBody({ type: Dto.LocationUpdateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('LOC-002'),
  })
  @HttpCode(200)
  update(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.LocationUpdateCommandBodyDto,
  ) {
    return this.commands.execute(
      new LocationUpdateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  @Get('bookings/:id/location')
  @ApiOperation({
    operationId: 'LOC-003',
    summary: 'Xem vị trí hiện tại',
    description:
      'Customer lấy vị trí photographer khi được phép. Role: Customer',
  })
  @Access(['customer'])
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('LOC-003'),
  })
  get(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new LocationGetQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }
}
