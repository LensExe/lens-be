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

  /**
   * Register a user in the system using the supplied data and current permissions.
   *
   * @param body Request body validated against the DTO.
   * @returns Result object containing the fields `user`.
   */
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
    // Register the account in Keycloak and retrieve the TokenSet.
    const { tokenSet, actor } =
      await this.authService.registerWithPassword(body);

    // Create the user's User, Customer, and Wallet records in the Lens database.
    const user = await this.commands.execute(
      new IdentityCustomerRegisterCommand(actor, {
        fullname: body.fullname,
      }),
    );

    return { ...tokenSet, user };
  }

  /**
   * Authenticate with an email and password, then return the tokens and session information.
   *
   * @param body Request body validated against the DTO.
   * @returns Result object containing the fields `user`.
   */
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

  /**
   * Exchange a refresh token for a new token set; reject the request if the token is invalid.
   *
   * @param body Request body validated against the DTO.
   * @returns Result returned by `refresh`.
   */
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

  /**
   * Revoke the refresh token if present and complete logout idempotently.
   *
   * @param body Request body validated against the DTO.
   * @returns Result returned by `logout`.
   */
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

  /**
   * Change the password after verifying the current password and applying the security policy.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result returned by `changePassword`.
   */
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

  /**
   * Send an OTP to verify a password reset request.
   *
   * @param body Request body validated against the DTO.
   * @returns Result returned by `sendOTP`.
   */
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

  /**
   * Verify the OTP used in the password recovery flow.
   *
   * @param body Request body validated against the DTO.
   * @returns Result returned by `verifyForgotPasswordOtp`.
   */
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

  /**
   * Reset the password after verifying the OTP and password reset token.
   *
   * @param body Request body validated against the DTO.
   * @returns Result returned by `resetPassword`.
   */
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

  /**
   * Send an email verification OTP to the current user.
   *
   * @param req HTTP request containing authentication information and request data.
   * @returns Result returned by `sendOTP`.
   */
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

  /**
   * Verify the user email using the supplied OTP.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result returned by `verifyEmail`.
   */
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
