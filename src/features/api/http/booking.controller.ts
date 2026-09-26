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
import { BookingAdminQuery } from '@modules/booking/bookings.query';
import { BookingCreateCommand } from '@modules/booking/bookings.command';
import { BookingListQuery } from '@modules/booking/bookings.query';
import { BookingAcceptCommand } from '@modules/booking/bookings.command';
import { BookingCancelCommand } from '@modules/booking/bookings.command';
import { BookingCompleteCommand } from '@modules/booking/bookings.command';
import { BookingCompleteShootCommand } from '@modules/booking/bookings.command';
import { BookingConfirmReceiptCommand } from '@modules/booking/bookings.command';
import { BookingDisputeCommand } from '@modules/booking/bookings.command';
import { BookingRejectCommand } from '@modules/booking/bookings.command';
import { BookingStartCommand } from '@modules/booking/bookings.command';
import { BookingTimelineQuery } from '@modules/booking/bookings.query';
import { BookingGetQuery } from '@modules/booking/bookings.query';
import { BookingCollaboratorAcceptCommand } from '@modules/booking/bookings.command';
import { BookingCollaboratorDeclineCommand } from '@modules/booking/bookings.command';
import { BookingCollaboratorInviteCommand } from '@modules/booking/bookings.command';
import { BookingCollaboratorRevokeCommand } from '@modules/booking/bookings.command';
import { BookingCollaboratorListQuery } from '@modules/booking/bookings.query';
import { BookingCollaboratorMeQuery } from '@modules/booking/bookings.query';

@ApiTags('Booking')
@Controller()
export class BookingController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
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

  @Post('bookings')
  @ApiOperation({
    operationId: 'BOOK-001',
    summary: 'Tạo booking',
    description: 'Customer gửi yêu cầu đặt lịch photographer. Role: Customer',
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
    return this.commands.execute(
      new BookingCreateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

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

  @Post('bookings/:id/accept')
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-004'),
  })
  @HttpCode(200)
  accept(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new BookingAcceptCommand(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Post('bookings/:id/cancel')
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiBody({ type: Dto.BookingCancelCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-006'),
  })
  @HttpCode(200)
  cancel(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.BookingCancelCommandBodyDto,
  ) {
    return this.commands.execute(
      new BookingCancelCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  @Post('bookings/:id/complete')
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-009'),
  })
  @HttpCode(200)
  complete(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new BookingCompleteCommand(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Post('bookings/:id/confirm-receipt')
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-012'),
  })
  @HttpCode(200)
  confirmReceipt(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new BookingConfirmReceiptCommand(req.actor ?? { sub: '', roles: [] }, {
        id,
      }),
    );
  }

  @Post('bookings/:id/complete-shoot')
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-008'),
  })
  @HttpCode(200)
  completeShoot(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new BookingCompleteShootCommand(req.actor ?? { sub: '', roles: [] }, {
        id,
      }),
    );
  }

  @Post('bookings/:id/dispute')
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiBody({ type: Dto.BookingDisputeCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-011'),
  })
  @HttpCode(200)
  dispute(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.BookingDisputeCommandBodyDto,
  ) {
    return this.commands.execute(
      new BookingDisputeCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  @Post('bookings/:id/reject')
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiBody({ type: Dto.BookingRejectCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-005'),
  })
  @HttpCode(200)
  reject(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.BookingRejectCommandBodyDto,
  ) {
    return this.commands.execute(
      new BookingRejectCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  @Post('bookings/:id/start')
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-007'),
  })
  @HttpCode(200)
  start(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new BookingStartCommand(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Get('bookings/:id/timeline')
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-010'),
  })
  timeline(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new BookingTimelineQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Get('bookings/:id')
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-002'),
  })
  get(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new BookingGetQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Post('bookings/:id/collaborators')
  @ApiOperation({
    operationId: 'BOOK-013',
    summary: 'Mời thợ liên kết',
    description:
      'Thợ chính mời thợ khác chụp cùng, chia % phần thợ nhận. Chỉ khi booking accepted/in_progress và gallery chưa publish; tổng % ≤ 100. Role: Photographer',
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
  @ApiBody({ type: Dto.BookingCollaboratorInviteCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-013'),
  })
  @HttpCode(200)
  inviteCollaborator(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.BookingCollaboratorInviteCommandBodyDto,
  ) {
    return this.commands.execute(
      new BookingCollaboratorInviteCommand(
        req.actor ?? { sub: '', roles: [] },
        { ...body, id },
      ),
    );
  }

  @Get('bookings/:id/collaborators')
  @ApiOperation({
    operationId: 'BOOK-014',
    summary: 'Danh sách thợ liên kết',
    description:
      'Mọi lời mời của booking theo thời gian. Khách, thợ chính và thợ được mời xem được. Role: Customer/Photographer/Admin',
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('BOOK-014'),
  })
  collaborators(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new BookingCollaboratorListQuery(req.actor ?? { sub: '', roles: [] }, {
        id,
      }),
    );
  }

  @Get('booking-collaborators/me')
  @ApiOperation({
    operationId: 'BOOK-015',
    summary: 'Lời mời liên kết của tôi',
    description:
      'Các lời mời liên kết gửi tới thợ đang đăng nhập, mới nhất trước. Role: Photographer',
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
    schema: responseSchema('BOOK-015'),
  })
  myCollaborations(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.BookingCollaboratorMeQueryQueryDto,
  ) {
    return this.queries.execute(
      new BookingCollaboratorMeQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }

  @Post('booking-collaborators/:id/accept')
  @ApiOperation({
    operationId: 'BOOK-016',
    summary: 'Nhận lời mời liên kết',
    description: 'Thợ được mời nhận lời mời còn chờ. Role: Photographer',
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
    schema: responseSchema('BOOK-016'),
  })
  @HttpCode(200)
  acceptCollaboration(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new BookingCollaboratorAcceptCommand(
        req.actor ?? { sub: '', roles: [] },
        { id },
      ),
    );
  }

  @Post('booking-collaborators/:id/decline')
  @ApiOperation({
    operationId: 'BOOK-017',
    summary: 'Từ chối lời mời liên kết',
    description:
      'Thợ được mời từ chối lời mời còn chờ; sau đó thợ chính không mời lại thợ này được. Role: Photographer',
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
    schema: responseSchema('BOOK-017'),
  })
  @HttpCode(200)
  declineCollaboration(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new BookingCollaboratorDeclineCommand(
        req.actor ?? { sub: '', roles: [] },
        { id },
      ),
    );
  }

  @Post('booking-collaborators/:id/revoke')
  @ApiOperation({
    operationId: 'BOOK-018',
    summary: 'Rút lời mời liên kết',
    description:
      'Thợ chính rút lời mời khi thợ được mời chưa trả lời. Role: Photographer',
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
    schema: responseSchema('BOOK-018'),
  })
  @HttpCode(200)
  revokeCollaboration(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new BookingCollaboratorRevokeCommand(
        req.actor ?? { sub: '', roles: [] },
        { id },
      ),
    );
  }
}
