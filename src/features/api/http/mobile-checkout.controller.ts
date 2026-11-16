import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Actor } from '@shared/platform/auth/actor';
import { DomainError } from '@shared/domain/domain.error';
import { CookieName } from '@shared/platform/cookie/enums';
import { CookieService } from '@shared/platform/cookie/cookie.service';
import { Access, Public } from '../auth/keycloak.guard';
import { BookingGetQuery } from '@modules/booking/core/bookings.query';
import {
  PaymentDepositCommand,
  PaymentRemainingCommand,
} from '@modules/payment/payment.command';
import {
  PaymentGetQuery,
  PaymentQrQuery,
} from '@modules/payment/transaction/transaction.query';
import { PaymentWalletQuery } from '@modules/payment/wallet/wallet.query';
import { responseSchema } from '../swagger';
import {
  MobileCheckoutHandoffBodyDto,
  MobileCheckoutHandoffExchangeBodyDto,
  MobileCheckoutPaymentBodyDto,
} from '../dto/mobile-checkout.dto';
import {
  MOBILE_CHECKOUT_SESSION_COOKIE,
  MobileCheckoutSessionGuard,
  mobileCheckoutSessionToken,
} from '../payment-handoff/mobile-checkout-session.guard';
import type { MobileCheckoutRequest } from '../payment-handoff/mobile-checkout-session.guard';
import { MobileCheckoutHandoffService } from '../payment-handoff/mobile-checkout-handoff.service';

@ApiTags('Mobile checkout handoff')
@Controller('mobile-checkout')
export class MobileCheckoutController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    private readonly checkout: MobileCheckoutHandoffService,
    private readonly cookies: CookieService,
    private readonly config: ConfigService,
  ) {}

  @Post('handoff')
  @HttpCode(200)
  @Access(['customer'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'PAY-027',
    summary: 'Tạo handoff từ mobile sang checkout web',
    description:
      'Mã chỉ gắn với booking, khoản cần thanh toán và tài khoản customer đang đăng nhập. Không thay đổi API thanh toán hiện có.',
  })
  @ApiBody({ type: MobileCheckoutHandoffBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Mã handoff và URL checkout web',
    schema: responseSchema('PAY-027'),
  })
  async createHandoff(
    @Req() request: { actor?: Actor },
    @Body() body: MobileCheckoutHandoffBodyDto,
  ) {
    const actor = request.actor ?? { sub: '', roles: [] };
    await this.queries.execute(
      new BookingGetQuery(actor, { booking_id: body.booking_id }),
    );
    const { code, expires_in } = await this.checkout.create(
      actor,
      body.booking_id,
      body.payment_purpose,
    );
    return {
      checkout_url: this.checkoutUrl(code),
      expires_in,
    };
  }

  @Post('handoff/exchange')
  @Public()
  @HttpCode(200)
  @ApiOperation({
    operationId: 'PAY-028',
    summary: 'Đổi mã handoff lấy phiên checkout giới hạn',
    description:
      'Mã dùng một lần; phiên checkout bị giới hạn vào đúng booking.',
  })
  @ApiBody({ type: MobileCheckoutHandoffExchangeBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Phiên checkout đã được đặt trong HttpOnly cookie',
    schema: responseSchema('PAY-028'),
  })
  async exchangeHandoff(
    @Body() body: MobileCheckoutHandoffExchangeBodyDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, session } = await this.checkout.exchange(body.code);
    this.cookies.attachHttpOnlyCookie({
      res: response,
      name: MOBILE_CHECKOUT_SESSION_COOKIE,
      value: token,
      options: {
        maxAge: Math.max(1_000, session.expires_at - Date.now()),
      },
    });
    if (!this.cookies.getCookie(request, CookieName.CsrfToken)) {
      this.cookies.attachReadableCookie({
        res: response,
        name: CookieName.CsrfToken,
        value: this.cookies.createCsrfToken(),
        options: { maxAge: Math.max(1_000, session.expires_at - Date.now()) },
      });
    }
    return { expires_in: Math.ceil((session.expires_at - Date.now()) / 1000) };
  }

  @Get('context')
  @Public()
  @UseGuards(MobileCheckoutSessionGuard)
  @ApiOperation({
    operationId: 'PAY-029',
    summary: 'Lấy booking cho checkout mobile',
    description:
      'Lấy booking, mục đích thanh toán và số dư Ví Lens bằng phiên handoff giới hạn.',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking và thông tin checkout gắn với phiên handoff',
    schema: responseSchema('PAY-029'),
  })
  async getContext(@Req() request: MobileCheckoutRequest) {
    const session = request.mobileCheckout!;
    const booking = await this.queries.execute(
      new BookingGetQuery(session.actor, { booking_id: session.booking_id }),
    );
    let walletBalance = 0;
    try {
      const wallet = await this.queries.execute(
        new PaymentWalletQuery(session.actor),
      );
      walletBalance = Number(wallet.balance ?? 0);
    } catch (error) {
      // A legacy customer without a wallet can still pay through the gateway.
      if (!(error instanceof DomainError) || error.code !== 'missing') {
        throw error;
      }
    }
    return {
      booking,
      payment_purpose: session.payment_purpose,
      return_target: session.return_target,
      payment_id: session.payment_id ?? null,
      wallet: { balance: walletBalance },
    };
  }

  @Post('payment-intent')
  @Public()
  @UseGuards(MobileCheckoutSessionGuard)
  @HttpCode(200)
  @ApiOperation({
    operationId: 'PAY-030',
    summary: 'Tạo payment intent theo phiên checkout mobile',
    description:
      'Tạo thanh toán cọc hoặc phần còn lại theo booking và tài khoản đã xác thực bằng handoff.',
  })
  @ApiBody({ type: MobileCheckoutPaymentBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Payment intent của booking',
    schema: responseSchema('PAY-030'),
  })
  async createPaymentIntent(
    @Req() request: MobileCheckoutRequest,
    @Body() body: MobileCheckoutPaymentBodyDto,
  ) {
    const session = request.mobileCheckout!;
    const input = {
      booking_id: session.booking_id,
      idempotency_key: body.idempotency_key,
      payment_method: body.payment_method,
    };
    const payment =
      session.payment_purpose === 'deposit'
        ? await this.commands.execute(
            new PaymentDepositCommand(session.actor, input),
          )
        : await this.commands.execute(
            new PaymentRemainingCommand(session.actor, input),
          );
    await this.checkout.rememberPayment(
      mobileCheckoutSessionToken(request, this.cookies),
      payment.id,
    );
    return payment;
  }

  @Get('payment-status')
  @Public()
  @UseGuards(MobileCheckoutSessionGuard)
  @ApiOperation({
    operationId: 'PAY-031',
    summary: 'Kiểm tra trạng thái thanh toán mobile checkout',
    description:
      'Lấy trạng thái giao dịch đã tạo trong phiên checkout; không có intent thì trả trạng thái not_created.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái payment intent trong phiên',
    schema: responseSchema('PAY-031'),
  })
  async getPaymentStatus(@Req() request: MobileCheckoutRequest) {
    const session = request.mobileCheckout!;
    if (!session.payment_id) return { status: 'not_created' };
    return this.queries.execute(
      new PaymentGetQuery(session.actor, { payment_id: session.payment_id }),
    );
  }

  @Get('payment-qr')
  @Public()
  @UseGuards(MobileCheckoutSessionGuard)
  @ApiOperation({
    operationId: 'PAY-032',
    summary: 'Lấy QR/cổng thanh toán của mobile checkout',
    description:
      'Lấy mã QR hoặc URL checkout cho payment intent thuộc phiên handoff.',
  })
  @ApiResponse({
    status: 200,
    description: 'QR và URL thanh toán của intent trong phiên',
    schema: responseSchema('PAY-032'),
  })
  async getPaymentQr(@Req() request: MobileCheckoutRequest) {
    const session = request.mobileCheckout!;
    if (!session.payment_id) return { status: 'not_created' };
    return this.queries.execute(
      new PaymentQrQuery(session.actor, { payment_id: session.payment_id }),
    );
  }

  private checkoutUrl(code: string): string {
    const configured = this.config.get<string>(
      'auth.keycloakGoogleFrontendRedirectUri',
    );
    if (!configured) {
      throw new ServiceUnavailableException(
        'Mobile checkout frontend URL is not configured',
      );
    }
    let url: URL;
    try {
      url = new URL(configured);
    } catch {
      throw new ServiceUnavailableException(
        'Mobile checkout frontend URL is invalid',
      );
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new ServiceUnavailableException(
        'Mobile checkout frontend must use HTTP or HTTPS',
      );
    }
    url.pathname = '/mobile-checkout/handoff';
    url.search = '';
    url.hash = '';
    url.searchParams.set('code', code);
    return url.toString();
  }
}
