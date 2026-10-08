import {
  Body,
  Controller,
  Get,
  Post,
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
import { Access } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import { BookingAdminQuery } from '@modules/booking/core/bookings.query';
import { BookingCreateCommand } from '@modules/booking/core/bookings.command';
import { BookingListQuery } from '@modules/booking/core/bookings.query';
import { BookingAcceptCommand } from '@modules/booking/core/bookings.command';
import { BookingCancelCommand } from '@modules/booking/core/bookings.command';
import { BookingAdminCancelCommand } from '@modules/booking/core/bookings.command';
import { BookingCompleteCommand } from '@modules/booking/core/bookings.command';
import { BookingCompleteShootCommand } from '@modules/booking/core/bookings.command';
import { BookingConfirmReceiptCommand } from '@modules/booking/core/bookings.command';
import { BookingDisputeCommand } from '@modules/booking/core/bookings.command';
import { BookingRejectCommand } from '@modules/booking/core/bookings.command';
import { BookingStartCommand } from '@modules/booking/core/bookings.command';
import { BookingTimelineQuery } from '@modules/booking/core/bookings.query';
import { BookingGetQuery } from '@modules/booking/core/bookings.query';

@ApiTags('Booking')
@Controller()
export class BookingController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  /**
   * List bookings for the admin view using the supplied filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('admin/bookings')
  @ApiOperation({
    operationId: 'ADM-005',
    summary: 'Theo dõi booking',
    description: 'Admin xem/lọc booking toàn hệ thống. Role: Admin',
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
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'limit',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: 'number',
    description: 'offset',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    description: 'status',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-005'),
  })
  admin(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.BookingAdminQueryQueryDto,
  ) {
    return this.queries.execute(
      new BookingAdminQuery(req.actor ?? { sub: '', roles: [] }, { ...query }),
    );
  }

  /**
   * Create a booking after validating the input and business rules.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('bookings')
  @ApiOperation({
    operationId: 'BOOK-001',
    summary: 'Tạo booking',
    description:
      'Customer gửi yêu cầu đặt lịch với đúng một photographer chịu trách nhiệm. Role: Customer',
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
  @ApiBody({ type: Dto.BookingCreateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-001'),
  })
  @HttpCode(200)
  create(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.BookingCreateCommandBodyDto,
  ) {
    const { booking_plan_id, ...bookingInput } = body;
    return this.commands.execute(
      new BookingCreateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...bookingInput,
        booking_plan_id,
      }),
    );
  }

  /**
   * List bookings using the supplied query filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('bookings')
  @ApiOperation({
    operationId: 'BOOK-003',
    summary: 'Danh sách booking',
    description:
      'Danh sách booking theo user, trạng thái và thời gian. Role: Customer/Photographer',
  })
  @Access(['customer', 'photographer'])
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
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'limit',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: 'number',
    description: 'offset',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    description: 'status',
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
    schema: responseSchema('BOOK-003'),
  })
  list(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.BookingListQueryQueryDto,
  ) {
    return this.queries.execute(
      new BookingListQuery(req.actor ?? { sub: '', roles: [] }, { ...query }),
    );
  }

  /**
   * Accept a booking after checking its status and business rules.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('bookings/:booking_id/accept')
  @ApiOperation({
    operationId: 'BOOK-004',
    summary: 'Chấp nhận booking',
    description: 'Photographer chấp nhận yêu cầu booking. Role: Photographer',
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
  @ApiParam({ name: 'booking_id', type: String, description: 'Booking UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-004'),
  })
  @HttpCode(200)
  accept(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
  ) {
    return this.commands.execute(
      new BookingAcceptCommand(req.actor ?? { sub: '', roles: [] }, {
        booking_id,
      }),
    );
  }

  /**
   * Cancel a booking and apply the related business rules.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('bookings/:booking_id/cancel')
  @ApiOperation({
    operationId: 'BOOK-006',
    summary: 'Hủy booking',
    description:
      'Customer/photographer hủy theo business rule. Role: Customer/Photographer',
  })
  @Access(['customer', 'photographer'])
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
  @ApiParam({ name: 'booking_id', type: String, description: 'Booking UUID' })
  @ApiBody({ type: Dto.BookingCancelCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-006'),
  })
  @HttpCode(200)
  cancel(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
    @Body() body: Dto.BookingCancelCommandBodyDto,
  ) {
    return this.commands.execute(
      new BookingCancelCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        booking_id,
      }),
    );
  }

  /**
   * Complete a booking after checking its status and business rules.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('bookings/:booking_id/complete')
  @ApiOperation({
    operationId: 'BOOK-009',
    summary: 'Hoàn tất booking',
    description:
      'Hoàn tất booking sau các điều kiện thanh toán/giao ảnh. Role: System/Admin',
  })
  @Access(['admin', 'system'])
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
  @ApiParam({ name: 'booking_id', type: String, description: 'Booking UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-009'),
  })
  @HttpCode(200)
  complete(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
  ) {
    return this.commands.execute(
      new BookingCompleteCommand(req.actor ?? { sub: '', roles: [] }, {
        booking_id: booking_id,
      }),
    );
  }

  /**
   * Confirm that the customer received the photos and complete the handoff.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('bookings/:booking_id/confirm-receipt')
  @ApiOperation({
    operationId: 'BOOK-012',
    summary: 'Khách xác nhận đã nhận ảnh',
    description:
      'Khách của booking xác nhận đã nhận ảnh, booking chuyển shot → completed. Cần đã trả đủ và gallery đã publish. Role: Customer',
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
  @ApiParam({ name: 'booking_id', type: String, description: 'Booking UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-012'),
  })
  @HttpCode(200)
  confirmReceipt(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
  ) {
    return this.commands.execute(
      new BookingConfirmReceiptCommand(req.actor ?? { sub: '', roles: [] }, {
        booking_id: booking_id,
      }),
    );
  }

  /**
   * Mark the photo shoot as complete to enable photo delivery.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('bookings/:booking_id/complete-shoot')
  @ApiOperation({
    operationId: 'BOOK-008',
    summary: 'Xác nhận chụp xong',
    description:
      'Photographer xác nhận hoàn thành buổi chụp. Role: Photographer',
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
  @ApiParam({ name: 'booking_id', type: String, description: 'Booking UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-008'),
  })
  @HttpCode(200)
  completeShoot(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
  ) {
    return this.commands.execute(
      new BookingCompleteShootCommand(req.actor ?? { sub: '', roles: [] }, {
        booking_id,
      }),
    );
  }

  /**
   * Record a customer dispute for a booking.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('bookings/:booking_id/dispute')
  @ApiOperation({
    operationId: 'BOOK-011',
    summary: 'Tạo tranh chấp booking',
    description:
      'Khởi tạo report với target là booking. Role: Customer/Photographer',
  })
  @Access(['customer', 'photographer'])
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
  @ApiParam({ name: 'booking_id', type: String, description: 'Booking UUID' })
  @ApiBody({ type: Dto.BookingDisputeCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-011'),
  })
  @HttpCode(200)
  dispute(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
    @Body() body: Dto.BookingDisputeCommandBodyDto,
  ) {
    return this.commands.execute(
      new BookingDisputeCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        booking_id: booking_id,
      }),
    );
  }

  /**
   * Reject a booking and record the reason when provided.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('bookings/:booking_id/reject')
  @ApiOperation({
    operationId: 'BOOK-005',
    summary: 'Từ chối booking',
    description: 'Photographer từ chối yêu cầu booking. Role: Photographer',
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
  @ApiParam({ name: 'booking_id', type: String, description: 'Booking UUID' })
  @ApiBody({ type: Dto.BookingRejectCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-005'),
  })
  @HttpCode(200)
  reject(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
    @Body() body: Dto.BookingRejectCommandBodyDto,
  ) {
    return this.commands.execute(
      new BookingRejectCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        booking_id,
      }),
    );
  }

  /**
   * Start a booking when its status and access permissions allow it.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('bookings/:booking_id/start')
  @ApiOperation({
    operationId: 'BOOK-007',
    summary: 'Bắt đầu buổi chụp',
    description:
      'Đưa booking sang trạng thái đang thực hiện. Role: Photographer',
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
  @ApiParam({ name: 'booking_id', type: String, description: 'Booking UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-007'),
  })
  @HttpCode(200)
  start(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
  ) {
    return this.commands.execute(
      new BookingStartCommand(req.actor ?? { sub: '', roles: [] }, {
        booking_id: booking_id,
      }),
    );
  }

  /**
   * Get the status transition history for the specified booking.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('bookings/:booking_id/timeline')
  @ApiOperation({
    operationId: 'BOOK-010',
    summary: 'Lịch sử trạng thái booking',
    description:
      'Các lần tạo / đổi trạng thái theo thời gian: từ, sang, bên thực hiện, lý do (reject/cancel). Role: Customer/Photographer/Admin',
  })
  @Access(['customer', 'photographer', 'admin'])
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
  @ApiParam({ name: 'booking_id', type: String, description: 'Booking UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-010'),
  })
  timeline(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
  ) {
    return this.queries.execute(
      new BookingTimelineQuery(req.actor ?? { sub: '', roles: [] }, {
        booking_id,
      }),
    );
  }

  /**
   * Get booking details by ID after checking access permissions.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('bookings/:booking_id')
  @ApiOperation({
    operationId: 'BOOK-002',
    summary: 'Chi tiết booking',
    description:
      'Lấy toàn bộ thông tin booking theo quyền truy cập. Role: Customer/Photographer/Admin',
  })
  @Access(['customer', 'photographer', 'admin'])
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
  @ApiParam({ name: 'booking_id', type: String, description: 'Booking UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-002'),
  })
  get(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
  ) {
    return this.queries.execute(
      new BookingGetQuery(req.actor ?? { sub: '', roles: [] }, {
        booking_id: booking_id,
      }),
    );
  }

  /**
   * Cancel a booking as an administrator and apply the corresponding refund rules.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('admin/bookings/:booking_id/cancel')
  @ApiOperation({
    operationId: 'BOOK-019',
    summary: 'Admin huỷ booking',
    description:
      'Admin huỷ booking ở mọi trạng thái chưa xong (chờ, đã nhận, đang chụp, đã chụp), bắt buộc lý do; dùng khi phải can thiệp. Role: Admin',
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
  @ApiParam({ name: 'booking_id', type: String, description: 'Booking UUID' })
  @ApiBody({ type: Dto.BookingCancelCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-019'),
  })
  @HttpCode(200)
  adminCancel(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
    @Body() body: Dto.BookingCancelCommandBodyDto,
  ) {
    return this.commands.execute(
      new BookingAdminCancelCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        booking_id: booking_id,
      }),
    );
  }
}
