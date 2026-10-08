import { randomInt } from 'node:crypto';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ExternalPaymentProvider } from '@shared/domain/values/payment.values';
import { PaymentGateway } from '@shared/integrations/payment/port/payment.port';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Access } from '../auth/keycloak.guard';
import { PayOsStandaloneTestPaymentBodyDto } from '../dto/payment.dto';

@ApiTags('Payment Test')
@Controller()
export class PayOsStandaloneTestController {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly config: ConfigService,
  ) {}

  @Post('payments/test/payos')
  @HttpCode(200)
  @Access(['admin'])
  @ApiOperation({
    operationId: 'PAY-TEST-001',
    summary: 'Tạo link/QR PayOS độc lập để kiểm tra tích hợp',
    description:
      'Tạo payment link trực tiếp với PayOS, không lưu transaction hay gắn với booking/ví/subscription. Chỉ khả dụng ngoài production khi PAYOS_STANDALONE_TEST_ENABLED=true. Webhook của link này không được Lens đối soát.',
  })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Only administrators can use this route',
  })
  @ApiBadRequestResponse({ description: 'Amount is outside the test limit' })
  @ApiBody({ type: PayOsStandaloneTestPaymentBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Standalone PayOS checkout link and QR payload',
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', example: 'payos' },
        order_code: { type: 'integer' },
        amount: { type: 'integer' },
        checkout_url: { type: 'string', nullable: true },
        qr_code: { type: 'string', nullable: true },
        expires_at: { type: 'string', format: 'date-time' },
        persisted: { type: 'boolean', example: false },
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description:
      'Test endpoint disabled, PayOS configuration missing, or provider unavailable',
  })
  async create(@Body() body: PayOsStandaloneTestPaymentBodyDto): Promise<{
    provider: 'payos';
    order_code: number;
    amount: number;
    checkout_url: string | null;
    qr_code: string | null;
    expires_at: string;
    persisted: false;
  }> {
    ensure(
      !this.config.get<boolean>('app.isProduction'),
      'Standalone PayOS test endpoint is disabled in production',
      'unavailable',
    );
    ensure(
      this.config.get<boolean>('payos.standaloneTestEnabled') === true,
      'Set PAYOS_STANDALONE_TEST_ENABLED=true to enable this endpoint',
      'unavailable',
    );

    // Use timestamp-derived codes outside the small DB sequence used by Lens transactions.
    const orderCode = Date.now() * 1000 + randomInt(0, 1000);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const checkout = await this.gateway.create(
      orderCode,
      body.amount,
      ExternalPaymentProvider.PAYOS,
      expiresAt,
      'PAYOSTEST',
    );

    return {
      provider: 'payos',
      order_code: orderCode,
      amount: body.amount,
      checkout_url: checkout.checkout_url,
      qr_code: checkout.qr_code,
      expires_at: expiresAt,
      persisted: false,
    };
  }
}
