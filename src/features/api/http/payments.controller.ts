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
import {
  PaymentAdminQuery,
  PaymentGetQuery,
  PaymentHistoryQuery,
  PaymentQrQuery,
} from '@modules/payment/transaction/transaction.query';
import {
  PaymentDepositCommand,
  PaymentExtendEscrowReleaseCommand,
  PaymentRemainingCommand,
  PaymentWebhookCommand,
} from '@modules/payment/payment.command';
import {
  PaymentRefundCommand,
  PaymentCustomerRefundCommand,
  PaymentApproveRefundCommand,
  PaymentRejectRefundCommand,
  PaymentCompleteRefundCommand,
  PaymentExtendRequestDeadlineCommand,
} from '@modules/payment/refund/refund.command';
import {
  PaymentRefundsQuery,
  PaymentAdminRefundsQuery,
  PaymentMyRefundsQuery,
} from '@modules/payment/refund/refund.query';
import {
  PaymentTopUpCommand,
  PaymentWithdrawalCommand,
} from '@modules/payment/wallet/wallet.command';
import {
  PaymentWalletQuery,
  PaymentWalletLedgerQuery,
} from '@modules/payment/wallet/wallet.query';

@ApiTags('Payment')
@Controller()
export class PaymentController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  /**
   * Get the current user’s wallet balance and details.
   *
   * @param req HTTP request containing authentication information and request data.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('wallet')
  @ApiOperation({
    operationId: 'PAY-009',
    summary: 'Xem số dư ví',
    description:
      'Xem số dư khả dụng và số dư đang bị giữ của người dùng hiện tại.',
  })
  @Access(['customer', 'photographer'])
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Wallet balance and frozen balance',
    schema: responseSchema('PAY-009'),
  })
  wallet(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new PaymentWalletQuery(req.actor ?? { sub: '', roles: [] }),
    );
  }

  /**
   * List wallet ledger entries using the supplied pagination filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('wallet/ledger')
  @ApiOperation({
    operationId: 'PAY-010',
    summary: 'Lịch sử biến động ví',
    description: 'Liệt kê sổ cái ví của người dùng hiện tại theo trang.',
  })
  @Access(['customer', 'photographer'])
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Immutable wallet ledger entries',
    schema: responseSchema('PAY-010'),
  })
  walletLedger(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.PaymentWalletLedgerQueryDto,
  ) {
    return this.queries.execute(
      new PaymentWalletLedgerQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }

  /**
   * Create a wallet deposit request.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('wallet/topups')
  @ApiOperation({
    operationId: 'PAY-011',
    summary: 'Nạp tiền vào ví',
    description:
      'Tạo payment intent nạp ví; chỉ webhook hợp lệ mới ghi có số dư.',
  })
  @Access(['customer', 'photographer'])
  @ApiBearerAuth()
  @ApiBody({ type: Dto.PaymentTopUpCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Payment intent to top up wallet',
    schema: responseSchema('PAY-011'),
  })
  topUp(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.PaymentTopUpCommandBodyDto,
  ) {
    return this.commands.execute(
      new PaymentTopUpCommand(req.actor ?? { sub: '', roles: [] }, body),
    );
  }

  /**
   * Create a wallet withdrawal request.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('wallet/withdrawals')
  @ApiOperation({
    operationId: 'PAY-012',
    summary: 'Yêu cầu rút tiền từ ví',
    description: 'Tạo request rút tiền và giữ số dư cho đến khi admin xử lý.',
  })
  @Access(['customer', 'photographer'])
  @ApiBearerAuth()
  @ApiBody({ type: Dto.PaymentWithdrawalCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request awaiting admin review',
    schema: responseSchema('PAY-012'),
  })
  withdrawal(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.PaymentWithdrawalCommandBodyDto,
  ) {
    return this.commands.execute(
      new PaymentWithdrawalCommand(req.actor ?? { sub: '', roles: [] }, body),
    );
  }

  /**
   * List the current user’s refund requests using the supplied pagination filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('me/refund-requests')
  @ApiOperation({
    operationId: 'PAY-013',
    summary: 'Danh sách yêu cầu refund/rút ví của tôi',
    description:
      'Liệt kê các request refund và rút ví của người dùng hiện tại.',
  })
  @Access(['customer', 'photographer'])
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Own refund and withdrawal requests',
    schema: responseSchema('PAY-013'),
  })
  myRefundRequests(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.PaymentWalletLedgerQueryDto,
  ) {
    return this.queries.execute(
      new PaymentMyRefundsQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }

  /**
   * List refund requests for admins using the supplied pagination filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('admin/refund-requests')
  @ApiOperation({
    operationId: 'PAY-015',
    summary: 'Danh sách refund/rút tiền cần xử lý',
    description: 'Admin xem các refund và withdrawal request cùng hạn xử lý.',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Refund and withdrawal review queue',
    schema: responseSchema('PAY-015'),
  })
  adminRefundRequests(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.PaymentRefundQueueQueryDto,
  ) {
    return this.queries.execute(
      new PaymentAdminRefundsQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }

  /**
   * Approve a refund request after checking permissions and its current status.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('admin/refund-requests/:id/approve')
  @ApiOperation({
    operationId: 'PAY-016',
    summary: 'Duyệt refund/rút tiền',
    description:
      'Admin duyệt request; khoản tiền được giữ đến khi ghi nhận hoàn tất.',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: Dto.PaymentRefundReviewBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Request approved; funds stay reserved until completion',
    schema: responseSchema('PAY-016'),
  })
  approveRefund(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.PaymentRefundReviewBodyDto,
  ) {
    return this.commands.execute(
      new PaymentApproveRefundCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  /**
   * Reject a refund request and record the reason.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('admin/refund-requests/:id/reject')
  @ApiOperation({
    operationId: 'PAY-017',
    summary: 'Từ chối refund/rút tiền',
    description: 'Admin từ chối request; số tiền rút bị giữ được trả lại ví.',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: Dto.PaymentRefundReviewBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Request rejected; reserved withdrawal balance is released',
    schema: responseSchema('PAY-017'),
  })
  rejectRefund(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.PaymentRefundReviewBodyDto,
  ) {
    return this.commands.execute(
      new PaymentRejectRefundCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  /**
   * Mark a refund request as processed and update the related transaction.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('admin/refund-requests/:id/complete')
  @ApiOperation({
    operationId: 'PAY-018',
    summary: 'Ghi nhận payout/refund đã chuyển thành công',
    description: 'Admin ghi nhận payout hoặc refund đã được chuyển thành công.',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: Dto.PaymentRefundCompleteBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Request completed after payout confirmation',
    schema: responseSchema('PAY-018'),
  })
  completeRefund(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.PaymentRefundCompleteBodyDto,
  ) {
    return this.commands.execute(
      new PaymentCompleteRefundCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  /** Extend an active refund or withdrawal processing deadline with an audit reason. */
  @Post('admin/refund-requests/:id/extend-deadline')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'PAY-019',
    summary: 'Gia hạn thời gian xử lý refund/rút tiền',
    description:
      'Admin gia hạn deadline xử lý request 1–168 giờ, bắt buộc ghi lý do và lưu audit.',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: Dto.PaymentDeadlineExtensionBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Processing deadline extended and recorded in the audit log',
    schema: responseSchema('PAY-019'),
  })
  extendPaymentRequestDeadline(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.PaymentDeadlineExtensionBodyDto,
  ) {
    return this.commands.execute(
      new PaymentExtendRequestDeadlineCommand(
        req.actor ?? { sub: '', roles: [] },
        { ...body, id },
      ),
    );
  }

  /** Extend a photographer's pending escrow payout hold with an audit reason. */
  @Post('admin/bookings/:id/escrow/extend-release')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'PAY-020',
    summary: 'Gia hạn thời gian giải ngân escrow',
    description:
      'Admin gia hạn ngày giải ngân escrow 1–168 giờ; cửa sổ customer gửi refund không thay đổi.',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiBody({ type: Dto.PaymentDeadlineExtensionBodyDto })
  @ApiResponse({
    status: 200,
    description:
      'Escrow release deadline extended and recorded in the audit log',
    schema: responseSchema('PAY-020'),
  })
  extendEscrowRelease(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.PaymentDeadlineExtensionBodyDto,
  ) {
    return this.commands.execute(
      new PaymentExtendEscrowReleaseCommand(
        req.actor ?? { sub: '', roles: [] },
        { ...body, id },
      ),
    );
  }

  /**
   * List records for the admin view using the supplied filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
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
  @ApiQuery({
    name: 'review_required',
    required: false,
    enum: ['true', 'false'],
    description: 'Lọc transaction cần admin đối soát checkout.',
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

  /**
   * Create a deposit payment request for a booking.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
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

  /**
   * Create a payment request for the remaining booking balance.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
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

  /**
   * Get transaction history for the specified subject after checking caller permissions.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
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
    description:
      'Payment history with the 72-hour escrow release and customer refund deadline, when applicable',
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

  /**
   * Create or retrieve the payment QR code for the specified transaction.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
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

  /**
   * Create a refund request after validating the transaction status and amount.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
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

  /**
   * Create one customer refund request for all refundable payments on a booking.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('bookings/:id/refund-requests')
  @ApiOperation({
    operationId: 'PAY-014',
    summary: 'Customer gửi yêu cầu hoàn tiền booking',
    description:
      'Tạo một yêu cầu refund cho booking; hệ thống phân bổ yêu cầu vào các transaction cọc/thanh toán đã trả. Yêu cầu gửi sau khi booking hoàn tất phải được tạo trong 72 giờ.',
  })
  @Access(['customer'])
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiBody({ type: Dto.PaymentRefundCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Refund request created',
    schema: responseSchema('PAY-014'),
  })
  customerRefund(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.PaymentRefundCommandBodyDto,
  ) {
    return this.commands.execute(
      new PaymentCustomerRefundCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        booking_id: id,
      }),
    );
  }

  /**
   * List refund requests associated with the specified transaction.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
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

  /**
   * Validate and process a webhook from the provider.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param provider Selected service provider.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
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
    description: 'Payment provider (payos or sepay)',
  })
  @ApiBody({
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PAY-006'),
  })
  @HttpCode(200)
  webhook(
    @Req()
    req: {
      actor?: Actor;
      headers: Record<string, string | string[] | undefined>;
    },
    @Param('provider') provider: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.commands.execute(
      new PaymentWebhookCommand(req.actor ?? { sub: '', roles: [] }, {
        payload: body,
        provider,
        headers: req.headers,
      }),
    );
  }

  /**
   * Get payment details by ID after checking access permissions.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
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
