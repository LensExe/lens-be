import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Access, Public } from '../auth/keycloak.guard';
import * as authDto from '../dto';
import { responseSchema } from '../swagger';
import { AuthService } from '../auth/auth.service';
import { IdentityCustomerRegisterCommand } from '@modules/identity/identity.command';
import { IdentityMeQuery } from '@modules/identity/identity.query';
import { type Actor } from '@shared/platform/auth/actor';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly commands: CommandBus,
    private readonly query: QueryBus,
  ) {}

  @Post('auth/register')
  @Public()
  @ApiOperation({
    operationId: 'AUTH-001',
    summary: 'Đăng ký tài khoản',
    description:
      'Đăng ký tài khoản bằng Email, Mật khẩu và Họ tên. Role: Public',
  })
  @ApiConflictResponse({
    description: 'Email hoặc tài khoản đã tồn tại',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation failed',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: authDto.AuthRegisterCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Token Keycloak và hồ sơ người dùng vừa tạo',
    schema: responseSchema('AUTH-008'),
  })
  @HttpCode(200)
  async register(@Body() body: authDto.AuthRegisterCommandBodyDto) {
    // Đăng ký tài khoản trên Keycloak và lấy TokenSet
    const { tokenSet, actor } =
      await this.authService.registerWithPassword(body);

    // Tạo hồ sơ người dùng (User, Customer, Wallet) trong Database Lens
    const user = await this.commands.execute(
      new IdentityCustomerRegisterCommand(actor, {
        fullname: body.fullname,
      }),
    );

    return { ...tokenSet, user };
  }

  @Post('auth/login')
  @Public()
  @ApiOperation({
    operationId: 'AUTH-009',
    summary: 'Đăng nhập tài khoản',
    description: 'User đăng nhập bằng Email và Mật khẩu. Role: Public',
  })
  @ApiUnauthorizedResponse({
    description: 'Email hoặc mật khẩu không chính xác',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation failed',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: authDto.AuthLoginQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Token Keycloak và thông tin hồ sơ người dùng',
    schema: responseSchema('AUTH-009'),
  })
  @HttpCode(200)
  async login(@Body() body: authDto.AuthLoginQueryDto) {
    // login with Keycloak
    const { tokenSet, actor } = await this.authService.loginWithPassword(body);

    // get user info in db
    const user = await this.query.execute(new IdentityMeQuery(actor, {}));
    return { ...tokenSet, user };
  }

  @Post('auth/refresh')
  @Public()
  @ApiOperation({
    operationId: 'AUTH-010',
    summary: 'Làm mới token',
    description: 'Làm mới token bằng Refresh Token. Role: Public',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh Token không chính xác',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation failed',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: authDto.AuthRefreshDto })
  @ApiResponse({
    status: 200,
    description: 'New Keycloak Tokens',
    schema: responseSchema('AUTH-010'),
  })
  @HttpCode(200)
  refresh(@Body() body: authDto.AuthRefreshDto) {
    return this.authService.refresh(body);
  }

  @Post('auth/logout')
  @Public()
  @ApiOperation({
    operationId: 'AUTH-011',
    summary: 'Đăng xuất',
    description: 'Đăng xuất khỏi hệ thống. Role: Public',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation failed',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: authDto.AuthLogoutDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('AUTH-011'),
  })
  @HttpCode(200)
  logout(@Body() body: authDto.AuthLogoutDto) {
    return this.authService.logout(body);
  }

  @Post('auth/change-password')
  @Access([])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'AUTH-012',
    summary: 'Thay đổi mật khẩu',
    description: 'Thay đổi mật khẩu của tài khoản. Role: Registration',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation failed',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: authDto.AuthChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('AUTH-012'),
  })
  changePassword(
    @Req() req: { actor?: Actor },
    @Body() body: authDto.AuthChangePasswordDto,
  ) {
    return this.authService.changePassword(req.actor!, body);
  }

  @Post('auth/forgot-password/send-otp')
  @Public()
  @ApiOperation({
    operationId: 'AUTH-013',
    summary: 'Quên mật khẩu. Gửi OTP',
    description:
      'Quên mật khẩu của tài khoản. Role: Public. Gửi OTP để đổi mật khẩu',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation failed',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: authDto.AuthSendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('AUTH-013'),
  })
  @HttpCode(200)
  sendForgotPasswordOtp(@Body() body: authDto.AuthSendOtpDto) {
    return this.authService.sendOTP({
      email: body.email,
      event: authDto.AuthOtpEvent.FORGOT_PASSWORD,
    });
  }

  @Post('auth/forgot-password/verify')
  @Public()
  @ApiOperation({
    operationId: 'AUTH-014',
    summary: 'Xác minh OTP quên mật khẩu',
    description:
      'Xác minh mã OTP để lấy reset_token đổi mật khẩu mới. Role: Public',
  })
  @ApiBadRequestResponse({
    description: 'Mã OTP không chính xác hoặc đã hết hạn',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: authDto.AuthVerifyForgotPasswordOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Xác minh OTP thành công và trả về reset_token',
    schema: responseSchema('AUTH-014'),
  })
  @HttpCode(200)
  verifyForgotPasswordOtp(
    @Body() body: authDto.AuthVerifyForgotPasswordOtpDto,
  ) {
    return this.authService.verifyForgotPasswordOtp(body);
  }

  @Post('auth/forgot-password/reset')
  @Public()
  @ApiOperation({
    operationId: 'AUTH-015',
    summary: 'Đặt lại mật khẩu mới',
    description: 'Đặt lại mật khẩu tài khoản bằng reset_token. Role: Public',
  })
  @ApiBadRequestResponse({
    description:
      'reset_token không hợp lệ/hết hạn hoặc mật khẩu xác nhận không khớp',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: authDto.AuthResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Đặt lại mật khẩu thành công',
    schema: responseSchema('AUTH-015'),
  })
  @HttpCode(200)
  resetPassword(@Body() body: authDto.AuthResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Post('auth/email/send-otp')
  @Access([])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'AUTH-016',
    summary: 'Gửi OTP xác minh Email',
    description: 'Gửi mã OTP để xác minh Email của tài khoản.',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation failed',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiResponse({
    status: 200,
    description: 'Gửi OTP thành công',
    schema: responseSchema('AUTH-016'),
  })
  @HttpCode(200)
  sendEmailOtp(@Req() req: { actor?: Actor }) {
    return this.authService.sendOTP({
      email: req.actor?.email || '',
      event: authDto.AuthOtpEvent.VERIFY_EMAIL,
    });
  }

  @Post('auth/email/verify')
  @Access([])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'AUTH-017',
    summary: 'Xác minh Email',
    description: 'Xác minh Email của tài khoản.',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation failed hoặc mã OTP không chính xác',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: authDto.AuthVerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Xác minh email thành công',
    schema: responseSchema('AUTH-017'),
  })
  @HttpCode(200)
  verifyEmail(
    @Req() req: { actor?: Actor },
    @Body() body: authDto.AuthVerifyEmailDto,
  ) {
    return this.authService.verifyEmail(req.actor!, body);
  }
}
