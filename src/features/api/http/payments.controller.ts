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
import { Access, Public } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import { PaymentAdminQuery } from '@modules/payment/payments.query';
import { PaymentDepositCommand } from '@modules/payment/payments.command';
import { PaymentRemainingCommand } from '@modules/payment/payments.command';
import { PaymentHistoryQuery } from '@modules/payment/payments.query';
import { PaymentQrQuery } from '@modules/payment/payments.query';
import { PaymentRefundCommand } from '@modules/payment/payments.command';
import { PaymentRefundsQuery } from '@modules/payment/payments.query';
import { PaymentWebhookCommand } from '@modules/payment/payments.command';
import { PaymentGetQuery } from '@modules/payment/payments.query';

@ApiTags('Payment')
@Controller()
export class PaymentController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
  @Get('admin/payments')
  @ApiOperation({
    operationId: 'ADM-006',
    summary: 'Theo dõi payment',
    description: 'Admin xem transaction/payment toàn hệ thống. Role: Admin',
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
    schema: responseSchema('ADM-006'),
  })
  admin(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.PaymentAdminQueryQueryDto,
  ) {
    return this.queries.execute(
      new PaymentAdminQuery(req.actor ?? { sub: '', roles: [] }, { ...query }),
    );
  }

  @Post('bookings/:id/payments/deposit')
  @ApiOperation({
    operationId: 'PAY-001',
    summary: 'Tạo thanh toán đặt cọc',
    description: 'Khởi tạo payment intent cho tiền cọc. Role: Customer',
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
  @ApiBody({ type: Dto.PaymentDepositCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PAY-001'),
  })
  @HttpCode(200)
  deposit(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.PaymentDepositCommandBodyDto,
  ) {
    return this.commands.execute(
      new PaymentDepositCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  @Post('bookings/:id/payments/remaining')
  @ApiOperation({
    operationId: 'PAY-002',
    summary: 'Tạo thanh toán còn lại',
    description:
      'Khởi tạo payment intent cho phần tiền còn lại. Role: Customer',
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
  @ApiBody({ type: Dto.PaymentRemainingCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PAY-002'),
  })
  @HttpCode(200)
  remaining(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.PaymentRemainingCommandBodyDto,
  ) {
    return this.commands.execute(
      new PaymentRemainingCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  @Get('bookings/:id/payments')
  @ApiOperation({
    operationId: 'PAY-003',
    summary: 'Lịch sử thanh toán booking',
    description:
      'Lấy các transaction/payment attempt của booking. Role: Customer/Photographer',
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
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PAY-003'),
  })
  history(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new PaymentHistoryQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Get('payments/:id/qr')
  @ApiOperation({
    operationId: 'PAY-005',
    summary: 'Lấy QR thanh toán',
    description:
      'Sinh/lấy QR cho khoản thanh toán còn lại. Role: Customer/Photographer',
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
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PAY-005'),
  })
  qr(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new PaymentQrQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Post('payments/:id/refund')
  @ApiOperation({
    operationId: 'PAY-007',
    summary: 'Yêu cầu hoàn tiền',
    description: 'Tạo refund theo quyền và chính sách. Role: Admin/System',
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
  @ApiBody({ type: Dto.PaymentRefundCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PAY-007'),
  })
  @HttpCode(200)
  refund(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.PaymentRefundCommandBodyDto,
  ) {
    return this.commands.execute(
      new PaymentRefundCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  @Get('payments/:id/refunds')
  @ApiOperation({
    operationId: 'PAY-008',
    summary: 'Lịch sử hoàn tiền',
    description: 'Theo dõi refund của payment. Role: Admin/Customer',
  })
  @Access(['customer', 'admin'])
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
    schema: responseSchema('PAY-008'),
  })
  refunds(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new PaymentRefundsQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Post('payments/webhooks/:provider')
  @ApiOperation({
    operationId: 'PAY-006',
    summary: 'Webhook cổng thanh toán',
    description:
      'Xác thực callback và cập nhật trạng thái idempotent. Role: Payment Provider',
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
  @ApiBody({ type: Dto.PaymentWebhookCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PAY-006'),
  })
  @HttpCode(200)
  webhook(
    @Req() req: { actor?: Actor },
    @Param('provider') provider: string,
    @Body() body: Dto.PaymentWebhookCommandBodyDto,
  ) {
    return this.commands.execute(
      new PaymentWebhookCommand(req.actor ?? { sub: '', roles: [] }, {
        payload: { ...body },
        provider,
      }),
    );
  }

  @Get('payments/:id')
  @ApiOperation({
    operationId: 'PAY-004',
    summary: 'Chi tiết thanh toán',
    description:
      'Lấy trạng thái payment intent/transaction. Role: Customer/Photographer',
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
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PAY-004'),
  })
  get(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new PaymentGetQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }
}
