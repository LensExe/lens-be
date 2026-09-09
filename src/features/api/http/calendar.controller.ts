import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
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
  ApiQuery,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import type { Actor } from '@shared/database/unit-of-work/unit-of-work.port';
import { Access, Public } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../responses';
import { CalendarCreateCommand } from '@modules/calendar/application/commands/calendar';
import { CalendarBlockCommand } from '@modules/calendar/application/commands/calendar';
import { CalendarMeQuery } from '@modules/calendar/application/queries/calendar';
import { CalendarUpdateCommand } from '@modules/calendar/application/commands/calendar';
import { CalendarRemoveCommand } from '@modules/calendar/application/commands/calendar';
import { CalendarUnblockCommand } from '@modules/calendar/application/commands/calendar';
import { CalendarAvailabilityQuery } from '@modules/calendar/application/queries/calendar';

@ApiTags('Calendar')
@Controller()
export class CalendarController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
  @Post('calendar/availability')
  @ApiOperation({
    operationId: 'CAL-003',
    summary: 'Tạo slot khả dụng',
    description:
      'Photographer khai báo thời gian có thể nhận booking. Role: Photographer',
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
  @ApiBody({ type: Dto.CalendarCreateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CAL-003'),
  })
  @HttpCode(200)
  create(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.CalendarCreateCommandBodyDto,
  ) {
    return this.commands.execute(
      new CalendarCreateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Post('calendar/blocked-times')
  @ApiOperation({
    operationId: 'CAL-006',
    summary: 'Khóa thời gian',
    description: 'Đánh dấu thời gian không nhận booking. Role: Photographer',
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
  @ApiBody({ type: Dto.CalendarBlockCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CAL-006'),
  })
  @HttpCode(200)
  block(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.CalendarBlockCommandBodyDto,
  ) {
    return this.commands.execute(
      new CalendarBlockCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Get('calendar/me')
  @ApiOperation({
    operationId: 'CAL-002',
    summary: 'Xem lịch cá nhân',
    description: 'Photographer xem lịch booking và slot. Role: Photographer',
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
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CAL-002'),
  })
  me(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new CalendarMeQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  @Patch('calendar/availability/:slotId')
  @ApiOperation({
    operationId: 'CAL-004',
    summary: 'Cập nhật slot',
    description: 'Sửa thời gian/trạng thái slot khả dụng. Role: Photographer',
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
  @ApiParam({ name: 'slotId', type: String, description: 'Resource UUID' })
  @ApiBody({ type: Dto.CalendarUpdateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CAL-004'),
  })
  update(
    @Req() req: { actor?: Actor },
    @Param('slotId', new ParseUUIDPipe()) slotId: string,
    @Body() body: Dto.CalendarUpdateCommandBodyDto,
  ) {
    return this.commands.execute(
      new CalendarUpdateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        slotId,
      }),
    );
  }

  @Delete('calendar/availability/:slotId')
  @ApiOperation({
    operationId: 'CAL-005',
    summary: 'Xóa slot',
    description: 'Xóa thời gian khả dụng chưa có booking. Role: Photographer',
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
  @ApiParam({ name: 'slotId', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CAL-005'),
  })
  remove(
    @Req() req: { actor?: Actor },
    @Param('slotId', new ParseUUIDPipe()) slotId: string,
  ) {
    return this.commands.execute(
      new CalendarRemoveCommand(req.actor ?? { sub: '', roles: [] }, {
        slotId,
      }),
    );
  }

  @Delete('calendar/blocked-times/:id')
  @ApiOperation({
    operationId: 'CAL-007',
    summary: 'Mở khóa thời gian',
    description: 'Xóa blocked time. Role: Photographer',
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
    schema: responseSchema('CAL-007'),
  })
  unblock(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new CalendarUnblockCommand(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Get('photographers/:id/availability')
  @ApiOperation({
    operationId: 'CAL-001',
    summary: 'Xem lịch trống',
    description: 'Khách hàng xem slot khả dụng của photographer. Role: Public',
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiQuery({
    name: 'from',
    required: false,
    type: 'string',
    description: 'from',
  })
  @ApiQuery({ name: 'to', required: false, type: 'string', description: 'to' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CAL-001'),
  })
  availability(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: Dto.CalendarAvailabilityQueryQueryDto,
  ) {
    return this.queries.execute(
      new CalendarAvailabilityQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
        id,
      }),
    );
  }
}
