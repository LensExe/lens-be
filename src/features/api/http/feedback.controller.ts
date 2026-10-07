import {
  Body,
  Controller,
  Get,
  Post,
  Put,
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
import type { Actor } from '@shared/platform/auth/actor';
import { Access, Public } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import {
  ReviewCreateCommand,
  ReviewHideCommand,
  ReviewRemoveCommand,
  ReviewReplyCommand,
  ReviewRestoreCommand,
  ReviewUpdateCommand,
} from '@modules/feedback/review/reviews.command';
import {
  ReviewAdminListQuery,
  ReviewListQuery,
  ReviewSummaryQuery,
} from '@modules/feedback/review/reviews.query';

@ApiTags('Review')
@Controller()
export class ReviewController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  /**
   * Create a review for a completed booking after checking permissions and status.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('bookings/:booking_id/reviews')
  @ApiOperation({
    operationId: 'REV-001',
    summary: 'Tạo đánh giá',
    description:
      'Customer đánh giá photographer sau booking hợp lệ. Role: Customer',
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
  @ApiBody({ type: Dto.ReviewCreateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('REV-001'),
  })
  @HttpCode(200)
  create(
    @Req() req: { actor?: Actor },
    @Param('booking_id', new ParseUUIDPipe()) booking_id: string,
    @Body() body: Dto.ReviewCreateCommandBodyDto,
  ) {
    return this.commands.execute(
      new ReviewCreateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        booking_id,
      }),
    );
  }

  /**
   * Summarize the requested subject’s review score and review count.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('photographers/:photographer_id/rating-summary')
  @ApiOperation({
    operationId: 'REV-003',
    summary: 'Tổng hợp rating',
    description: 'Điểm trung bình và phân bố rating. Role: Public',
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
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('REV-003'),
  })
  summary(
    @Req() req: { actor?: Actor },
    @Param('photographer_id', new ParseUUIDPipe()) photographer_id: string,
  ) {
    return this.queries.execute(
      new ReviewSummaryQuery(req.actor ?? { sub: '', roles: [] }, {
        photographer_id,
      }),
    );
  }

  /**
   * List reviews for the specified subject using the supplied pagination filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('photographers/:photographer_id/reviews')
  @ApiOperation({
    operationId: 'REV-002',
    summary: 'Danh sách đánh giá',
    description:
      'Phân trang review đang hiện của photographer, kèm tên và ảnh đại diện của khách (không trả ID khách / booking). Role: Public',
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
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('REV-002'),
  })
  list(
    @Req() req: { actor?: Actor },
    @Param('photographer_id', new ParseUUIDPipe()) photographer_id: string,
    @Query() query: Dto.ReviewListQueryQueryDto,
  ) {
    return this.queries.execute(
      new ReviewListQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
        photographer_id,
      }),
    );
  }

  /**
   * Update a customer review after checking ownership.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Patch('reviews/:feedback_id')
  @ApiOperation({
    operationId: 'REV-004',
    summary: 'Cập nhật đánh giá',
    description:
      'Chỉnh review trong thời gian/chính sách cho phép. Role: Customer',
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
  @ApiParam({ name: 'feedback_id', type: String, description: 'Feedback UUID' })
  @ApiBody({ type: Dto.ReviewUpdateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('REV-004'),
  })
  update(
    @Req() req: { actor?: Actor },
    @Param('feedback_id', new ParseUUIDPipe()) feedback_id: string,
    @Body() body: Dto.ReviewUpdateCommandBodyDto,
  ) {
    return this.commands.execute(
      new ReviewUpdateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        feedback_id,
      }),
    );
  }

  /**
   * Delete a review by ID after checking the caller’s permissions.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Delete('reviews/:feedback_id')
  @ApiOperation({
    operationId: 'REV-005',
    summary: 'Xóa đánh giá',
    description:
      'Khách tự xoá review của mình (xoá mềm, không hiện lại được). Role: Customer',
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
  @ApiParam({ name: 'feedback_id', type: String, description: 'Feedback UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('REV-005'),
  })
  remove(
    @Req() req: { actor?: Actor },
    @Param('feedback_id', new ParseUUIDPipe()) feedback_id: string,
  ) {
    return this.commands.execute(
      new ReviewRemoveCommand(req.actor ?? { sub: '', roles: [] }, {
        feedback_id,
      }),
    );
  }

  /**
   * Add or update the photographer’s reply to the specified review.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Put('reviews/:feedback_id/reply')
  @ApiOperation({
    operationId: 'REV-006',
    summary: 'Thợ trả lời đánh giá',
    description:
      'Thợ của booking trả lời review đang hiện; gửi lại thì ghi đè câu trả lời cũ. Role: Photographer',
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
  @ApiParam({ name: 'feedback_id', type: String, description: 'Feedback UUID' })
  @ApiBody({ type: Dto.ReviewReplyCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('REV-006'),
  })
  reply(
    @Req() req: { actor?: Actor },
    @Param('feedback_id', new ParseUUIDPipe()) feedback_id: string,
    @Body() body: Dto.ReviewReplyCommandBodyDto,
  ) {
    return this.commands.execute(
      new ReviewReplyCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        feedback_id,
      }),
    );
  }

  /**
   * Restore a hidden review if the caller has permission.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('admin/reviews/:feedback_id/restore')
  @ApiOperation({
    operationId: 'REV-007',
    summary: 'Admin hiện lại đánh giá',
    description:
      'Hiện lại review do admin ẩn và tính lại điểm của thợ; review khách tự xoá không hiện lại được. Role: Admin',
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
  @ApiParam({ name: 'feedback_id', type: String, description: 'Feedback UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('REV-007'),
  })
  @HttpCode(200)
  restore(
    @Req() req: { actor?: Actor },
    @Param('feedback_id', new ParseUUIDPipe()) feedback_id: string,
  ) {
    return this.commands.execute(
      new ReviewRestoreCommand(req.actor ?? { sub: '', roles: [] }, {
        feedback_id,
      }),
    );
  }

  /**
   * Hide a review after checking permissions and the moderation reason.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('admin/reviews/:feedback_id/hide')
  @ApiOperation({
    operationId: 'REV-009',
    summary: 'Admin ẩn đánh giá',
    description:
      'Ẩn review đang hiện kèm lý do, tính lại điểm của thợ và báo khách. Role: Admin',
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
  @ApiParam({ name: 'feedback_id', type: String, description: 'Feedback UUID' })
  @ApiBody({ type: Dto.ReviewHideCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('REV-009'),
  })
  @HttpCode(200)
  hide(
    @Req() req: { actor?: Actor },
    @Param('feedback_id', new ParseUUIDPipe()) feedback_id: string,
    @Body() body: Dto.ReviewHideCommandBodyDto,
  ) {
    return this.commands.execute(
      new ReviewHideCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        feedback_id,
      }),
    );
  }

  /**
   * List records for the admin view.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('admin/reviews')
  @ApiOperation({
    operationId: 'REV-008',
    summary: 'Admin xem danh sách đánh giá',
    description:
      'Admin xem mọi review (kể cả đã xoá / bị ẩn), lọc theo trạng thái và thợ, để ẩn hoặc hiện lại. Role: Admin',
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
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('REV-008'),
  })
  adminList(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.ReviewAdminListQueryQueryDto,
  ) {
    return this.queries.execute(
      new ReviewAdminListQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }
}
