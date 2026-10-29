import {
  Body,
  Controller,
  Get,
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
import { CalendarBlockCommand } from '@modules/calendar/schedule/calendar.command';
import { CalendarMeQuery } from '@modules/calendar/schedule/calendar.query';
import { CalendarUnblockCommand } from '@modules/calendar/schedule/calendar.command';
import { CalendarAvailabilityQuery } from '@modules/calendar/schedule/calendar.query';
import { CalendarBlockPreviewQuery } from '@modules/calendar/schedule/calendar.query';
import { CalendarOfflineSlotsQuery } from '@modules/calendar/schedule/calendar.query';

@ApiTags('Calendar')
@Controller()
export class CalendarController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  /**
   * Block a time range in the photographer’s work calendar.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('calendar/blocked-times')
  @ApiOperation({
    operationId: 'CAL-006',
    summary: 'Chặn lịch',
    description:
      'Đánh dấu khoảng bận không nhận booking: nguyên ngày (date, giờ VN) hoặc from–to. Có yêu cầu đang chờ chồng giờ thì phải gửi decline_pending: true, không thì 409. Role: Photographer',
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

  /**
   * Get the current user information from the authenticated identity.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('calendar/me')
  @ApiOperation({
    operationId: 'CAL-002',
    summary: 'Xem lịch cá nhân',
    description:
      'Photographer xem booking và các khoảng đã chặn, lọc theo from/to. Role: Photographer',
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
  me(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.CalendarMeQueryQueryDto,
  ) {
    return this.queries.execute(
      new CalendarMeQuery(req.actor ?? { sub: '', roles: [] }, query),
    );
  }

  /**
   * Remove a blocked time range from the photographer’s calendar.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Delete('calendar/blocked-times/:offline_slot_id')
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
  @ApiParam({
    name: 'offline_slot_id',
    type: String,
    description: 'Offline slot UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CAL-007'),
  })
  unblock(
    @Req() req: { actor?: Actor },
    @Param('offline_slot_id', new ParseUUIDPipe()) offline_slot_id: string,
  ) {
    return this.commands.execute(
      new CalendarUnblockCommand(req.actor ?? { sub: '', roles: [] }, {
        offline_slot_id: offline_slot_id,
      }),
    );
  }

  /**
   * Get the available time ranges in the photographer’s calendar.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('photographers/:photographer_id/availability')
  @ApiOperation({
    operationId: 'CAL-001',
    summary: 'Xem lịch trống',
    description:
      'Khách hàng xem thời gian trống: toàn bộ khoảng truy vấn mặc định rảnh, trừ khoảng photographer đã chặn và booking đang giữ giờ. Role: Public',
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
  @ApiParam({
    name: 'photographer_id',
    type: String,
    description: 'Photographer UUID',
  })
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
    @Param('photographer_id', new ParseUUIDPipe()) photographer_id: string,
    @Query() query: Dto.CalendarAvailabilityQueryQueryDto,
  ) {
    return this.queries.execute(
      new CalendarAvailabilityQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
        photographer_id: photographer_id,
      }),
    );
  }

  /**
   * Get future blocked time slots that customers should exclude when booking a photographer.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param photographer_id Photographer profile ID.
   * @param query Optional future time window.
   * @returns Future offline slots without their private reason.
   */
  @Get('photographers/:photographer_id/offline-slots')
  @ApiOperation({
    operationId: 'CAL-011',
    summary: 'Xem lịch bận trong tương lai',
    description:
      'Khách hàng lấy các offline-slot có thời điểm bắt đầu trong khoảng tương lai để loại khỏi lịch đặt. Mặc định 30 ngày tới, tối đa 93 ngày; không trả về lý do riêng tư. Photographer phải đang hoạt động và đã được xác minh. Role: Public',
  })
  @Public()
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiParam({
    name: 'photographer_id',
    type: String,
    description: 'Photographer UUID',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: 'string',
    description:
      'Khoảng bắt đầu lọc; thời điểm trong quá khứ được nâng lên hiện tại',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: 'string',
    description: 'Mốc kết thúc lọc (exclusive)',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CAL-011'),
  })
  offlineSlots(
    @Req() req: { actor?: Actor },
    @Param('photographer_id', new ParseUUIDPipe()) photographer_id: string,
    @Query() query: Dto.CalendarAvailabilityQueryQueryDto,
  ) {
    return this.queries.execute(
      new CalendarOfflineSlotsQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
        photographer_id,
      }),
    );
  }

  /**
   * Preview a calendar block and return the affected bookings.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('calendar/blocked-times/affected')
  @ApiOperation({
    operationId: 'CAL-010',
    summary: 'Xem trước yêu cầu bị ảnh hưởng khi chặn lịch',
    description:
      'Các yêu cầu booking đang chờ chồng lên khoảng định chặn; có thì khi chặn phải gửi decline_pending: true. Role: Photographer',
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
    schema: responseSchema('CAL-010'),
  })
  blockPreview(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.CalendarBlockPreviewQueryQueryDto,
  ) {
    return this.queries.execute(
      new CalendarBlockPreviewQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }
}
