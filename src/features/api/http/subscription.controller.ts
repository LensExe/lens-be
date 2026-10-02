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
import type { Actor } from '@shared/platform/auth/actor';
import { Access, Public } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import { SubscriptionUsageQuery } from '@modules/subscription/subscriptions.query';
import { SubscriptionMeQuery } from '@modules/subscription/subscriptions.query';
import { SubscriptionHistoryQuery } from '@modules/subscription/subscriptions.query';
import { SubscriptionPlansQuery } from '@modules/subscription/subscriptions.query';
import { SubscriptionCreateCommand } from '@modules/subscription/subscriptions.command';
import { SubscriptionCancelCommand } from '@modules/subscription/subscriptions.command';
import { SubscriptionWebhookCommand } from '@modules/subscription/subscriptions.command';
import { SubscriptionResolvePaymentReviewCommand } from '@modules/subscription/subscriptions.command';

@ApiTags('Subscription')
@Controller()
export class SubscriptionController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  /**
   * Summarize the current subscription usage for the user.
   *
   * @param req HTTP request containing authentication information and request data.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('subscriptions/me/usage')
  @ApiOperation({
    operationId: 'SUB-005',
    summary: 'Xem usage/quota',
    description: 'Xem dung lượng và quyền lợi đã sử dụng. Role: Photographer',
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
    schema: responseSchema('SUB-005'),
  })
  usage(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new SubscriptionUsageQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  /**
   * Get the current user information from the authenticated identity.
   *
   * @param req HTTP request containing authentication information and request data.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('subscriptions/me')
  @ApiOperation({
    operationId: 'SUB-003',
    summary: 'Subscription hiện tại',
    description:
      'Lấy gói, trạng thái, ngày hết hạn và entitlement. Role: Photographer',
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
    schema: responseSchema('SUB-003'),
  })
  me(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new SubscriptionMeQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  /** List the authenticated photographer's subscription lifecycle events. */
  @Get('subscriptions/me/history')
  @ApiOperation({
    operationId: 'SUB-007',
    summary: 'Lịch sử subscription',
    description: 'Xem các lần đăng ký, kích hoạt, hủy gia hạn và hết hạn.',
  })
  @Access(['photographer'])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('SUB-007'),
  })
  history(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new SubscriptionHistoryQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  /**
   * List the subscriptions available for enrollment.
   *
   * @param req HTTP request containing authentication information and request data.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('plans')
  @ApiOperation({
    operationId: 'SUB-001',
    summary: 'Danh sách gói VIP',
    description: 'Lấy plan và entitlement public. Role: Public',
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
    schema: responseSchema('SUB-001'),
  })
  plans(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new SubscriptionPlansQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  /**
   * Create a subscription after validating the input and business rules.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('subscriptions')
  @ApiOperation({
    operationId: 'SUB-002',
    summary: 'Đăng ký gói VIP',
    description: 'Khởi tạo subscription/payment. Role: Photographer',
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
  @ApiBody({ type: Dto.SubscriptionCreateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('SUB-002'),
  })
  @HttpCode(200)
  create(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.SubscriptionCreateCommandBodyDto,
  ) {
    return this.commands.execute(
      new SubscriptionCreateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  /**
   * Cancel a subscription and apply the related business rules.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('subscriptions/:id/cancel')
  @ApiOperation({
    operationId: 'SUB-004',
    summary: 'Hủy gia hạn subscription',
    description:
      'Ngừng gia hạn sau kỳ đã thanh toán; quyền lợi còn đến end_at. Role: Photographer',
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
    schema: responseSchema('SUB-004'),
  })
  @HttpCode(200)
  cancel(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new SubscriptionCancelCommand(req.actor ?? { sub: '', roles: [] }, {
        id,
      }),
    );
  }

  /** Resolve a subscription payment after automatic provider reconciliation. */
  @Post('admin/subscriptions/payments/:id/reconcile')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'SUB-008',
    summary: 'Đối soát payment subscription',
    description:
      'Admin xác nhận payment để kích hoạt subscription hoặc tạo yêu cầu refund, hoặc xác nhận chưa thu tiền để đóng checkout.',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String, description: 'Transaction UUID' })
  @ApiBody({ type: Dto.SubscriptionPaymentReviewResolutionBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Subscription payment review resolved and recorded.',
    schema: responseSchema('SUB-008'),
  })
  resolvePaymentReview(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.SubscriptionPaymentReviewResolutionBodyDto,
  ) {
    return this.commands.execute(
      new SubscriptionResolvePaymentReviewCommand(
        req.actor ?? { sub: '', roles: [] },
        { ...body, id },
      ),
    );
  }

  /**
   * Validate and process a webhook from the provider.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param provider Selected service provider.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('subscriptions/webhooks/:provider')
  @ApiOperation({
    operationId: 'SUB-006',
    summary: 'Webhook subscription payment',
    description:
      'Cập nhật trạng thái subscription idempotent. Role: Payment Provider',
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
    name: 'provider',
    type: String,
    description: 'Payment provider (payos)',
  })
  @ApiBody({ type: Dto.SubscriptionWebhookCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('SUB-006'),
  })
  @HttpCode(200)
  webhook(
    @Req() req: { actor?: Actor },
    @Param('provider') provider: string,
    @Body() body: Dto.SubscriptionWebhookCommandBodyDto,
  ) {
    return this.commands.execute(
      new SubscriptionWebhookCommand(req.actor ?? { sub: '', roles: [] }, {
        payload: { ...body },
        provider,
      }),
    );
  }
}
