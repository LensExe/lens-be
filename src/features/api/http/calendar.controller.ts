import {
  Body,
  Controller,
  Get,
  Put,
  Post,
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
import type { Actor } from '@shared/platform/auth/actor';
import { Access, Public } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import { CalendarBlockCommand } from '@modules/calendar/calendar.command';
import { CalendarMeQuery } from '@modules/calendar/calendar.query';
import { CalendarUnblockCommand } from '@modules/calendar/calendar.command';
import { CalendarAvailabilityQuery } from '@modules/calendar/calendar.query';
import { CalendarWorkingHoursQuery } from '@modules/calendar/calendar.query';
import { CalendarSetWorkingHoursCommand } from '@modules/calendar/calendar.command';

@ApiTags('Calendar')
@Controller()
export class CalendarController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
  @Post('calendar/blocked-times')
  @ApiOperation({
    operationId: 'CAL-006',
    summary: 'Chặn lịch',
    description:
      'Đánh dấu khoảng bận không nhận booking: nguyên ngày (date, giờ VN) hoặc from–to. Role: Photographer',
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

  @Get('calendar/me/working-hours')
  @ApiOperation({
    operationId: 'CAL-008',
    summary: 'Xem giờ làm việc',
    description:
      'Thợ xem lịch làm việc theo tuần; chưa khai thì trả giờ mặc định 08:00-20:00. Role: Photographer',
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
    schema: responseSchema('CAL-008'),
  })
  workingHours(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new CalendarWorkingHoursQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  @Put('calendar/me/working-hours')
  @ApiOperation({
    operationId: 'CAL-009',
    summary: 'Khai giờ làm việc',
    description:
      'Thợ thay toàn bộ lịch làm việc theo tuần (giờ Việt Nam); danh sách rỗng thì quay về giờ mặc định. Role: Photographer',
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
  @ApiBody({ type: Dto.CalendarSetWorkingHoursCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CAL-009'),
  })
  setWorkingHours(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.CalendarSetWorkingHoursCommandBodyDto,
  ) {
    return this.commands.execute(
      new CalendarSetWorkingHoursCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Get('calendar/me')
  @ApiOperation({
    operationId: 'CAL-002',
    summary: 'Xem lịch cá nhân',
    description:
      'Photographer xem lịch booking và các ngày đã chặn. Role: Photographer',
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
    description:
      'Khách hàng xem thời gian khả dụng, mặc định 24/7 trừ ngày chặn và booking. Role: Public',
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
