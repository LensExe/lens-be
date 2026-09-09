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
import { Access, Public } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../responses';
import { SubscriptionUsageQuery } from '@modules/subscription/application/queries/subscriptions';
import { SubscriptionMeQuery } from '@modules/subscription/application/queries/subscriptions';
import { SubscriptionPlansQuery } from '@modules/subscription/application/queries/subscriptions';
import { SubscriptionCreateCommand } from '@modules/subscription/application/commands/subscriptions';
import { SubscriptionCancelCommand } from '@modules/subscription/application/commands/subscriptions';
import { SubscriptionWebhookCommand } from '@modules/subscription/application/commands/subscriptions';

@ApiTags('Subscription')
@Controller()
export class SubscriptionController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
  @Get('subscriptions/me/usage')
  @ApiOperation({
    operationId: 'SUB-005',
    summary: 'Xem usage/quota',
    description: 'Xem dung lượng và quyền lợi đã sử dụng. Role: Customer',
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

  @Get('subscriptions/me')
  @ApiOperation({
    operationId: 'SUB-003',
    summary: 'Subscription hiện tại',
    description:
      'Lấy gói, trạng thái, ngày hết hạn và entitlement. Role: Customer',
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

  @Post('subscriptions')
  @ApiOperation({
    operationId: 'SUB-002',
    summary: 'Đăng ký gói VIP',
    description: 'Khởi tạo subscription/payment. Role: Customer',
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

  @Post('subscriptions/:id/cancel')
  @ApiOperation({
    operationId: 'SUB-004',
    summary: 'Hủy gia hạn subscription',
    description: 'Dừng auto-renew theo chính sách. Role: Customer',
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
