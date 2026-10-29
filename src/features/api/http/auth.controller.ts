import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOperation,
  ApiHeader,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Access, Public } from '../auth/keycloak.guard';
import * as authDto from '../dto';
import { responseSchema } from '../swagger';
import { AuthService } from '../auth/auth.service';
import { IdentityRegisterCommand } from '@modules/identity/identity.command';
import { IdentityMeQuery } from '@modules/identity/identity.query';
import { type Actor } from '@shared/platform/auth/actor';
import { RegistrationRole } from '@shared/domain/values/user.values';
import {
  AuthCookieSessionService,
  isCookieAuthRequest,
} from '../auth/auth-cookie-session';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly commands: CommandBus,
    private readonly query: QueryBus,
    private readonly cookieSession: AuthCookieSessionService,
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
      'Đăng ký bằng email, mật khẩu, họ tên và role customer hoặc photographer. Role được gán ngay khi tạo tài khoản; hồ sơ photographer vẫn ở trạng thái chưa xác minh cho đến khi được admin duyệt. Gửi lại cùng thông tin có thể hoàn tất hồ sơ nếu lần trước bị gián đoạn. Role: Public',
  })
  @ApiHeader({
    name: 'X-Lens-Auth-Mode',
    required: false,
    description: 'Gửi giá trị `cookie` để lưu phiên trong HttpOnly cookie.',
  })
  @ApiConflictResponse({
    description: 'Email hoặc tài khoản đã tồn tại',
  })
  @ApiBadRequestResponse({
    description:
      'DTO validation failed or Keycloak rejected the account details',
  })
  @ApiUnauthorizedResponse({
    description: 'Credentials do not match the existing Keycloak account',
  })
  @ApiBadGatewayResponse({
    description: 'Keycloak returned an upstream error',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: authDto.AuthRegisterCommandBodyDto })
  @ApiResponse({
    status: 200,
    description:
      'Hồ sơ người dùng; phiên trình duyệt được đặt trong cookie HttpOnly.',
    schema: responseSchema('AUTH-008'),
  })
  @HttpCode(200)
  async register(
    @Body() body: authDto.AuthRegisterCommandBodyDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Register the account in Keycloak and retrieve the TokenSet.
    const { tokenSet, actor } =
      await this.authService.registerWithPassword(body);

    console.log('qua key cloak r');

    // Initialize the shared user and the selected customer or photographer profile.
    await this.commands.execute(
      new IdentityRegisterCommand(actor, {
        fullname: body.fullname,
        role: body.role,
      }),
    );

    const identity = await this.query.execute(new IdentityMeQuery(actor, {}));
    // The selected profile role is granted during signup. Photographer
    // verification remains an independent admin-review state.
    const registrationRole =
      identity.role ?? body.role ?? RegistrationRole.CUSTOMER;
    const sessionTokenSet = await this.authService.synchronizeRole(
      actor,
      tokenSet,
      registrationRole,
      { ensureRealmMapping: true },
    );

    const cookieMode = isCookieAuthRequest(request);
    if (cookieMode) {
      this.cookieSession.setSessionCookies(request, response, sessionTokenSet);
    }
    return {
      ...(cookieMode ? {} : sessionTokenSet),
      user: identity,
      roles: [...new Set([...actor.roles, registrationRole])],
      email_verified: actor.email_verified ?? false,
      ...(cookieMode ? { expires_in: sessionTokenSet.expires_in } : {}),
    };
  } // done

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
  @ApiHeader({
    name: 'X-Lens-Auth-Mode',
    required: false,
    description: 'Gửi giá trị `cookie` để lưu phiên trong HttpOnly cookie.',
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
    description:
      'Thông tin hồ sơ; phiên trình duyệt được đặt trong cookie HttpOnly.',
    schema: responseSchema('AUTH-009'),
  })
  @HttpCode(200)
  async login(
    @Body() body: authDto.AuthLoginQueryDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // login with Keycloak
    const { tokenSet, actor } = await this.authService.loginWithPassword(body);
    // get user info in db
    const user = await this.query.execute(new IdentityMeQuery(actor, {}));
    const cookieMode = isCookieAuthRequest(request);
    if (cookieMode) {
      this.cookieSession.setSessionCookies(request, response, tokenSet);
    }
    return {
      ...(cookieMode ? {} : tokenSet),
      user,
      roles: actor.roles,
      email_verified: actor.email_verified ?? false,
      ...(cookieMode ? { expires_in: tokenSet.expires_in } : {}),
    };
  } // done

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
  @ApiHeader({
    name: 'X-Lens-Auth-Mode',
    required: false,
    description:
      'Gửi giá trị `cookie` để dùng refresh token từ HttpOnly cookie.',
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
    description: 'Cookie phiên mới hoặc token set cho client Bearer.',
    schema: responseSchema('AUTH-010'),
  })
  @HttpCode(200)
  async refresh(
    @Body() body: authDto.AuthRefreshDto = {},
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieMode = isCookieAuthRequest(request);
    const cookieRefreshToken = this.cookieSession.getRefreshToken(request);
    if (cookieMode && cookieRefreshToken) {
      this.cookieSession.assertCsrfToken(request);
    }

    const refreshToken = cookieMode
      ? (cookieRefreshToken ?? body.refresh_token)
      : (body.refresh_token ?? cookieRefreshToken);
    try {
      const tokenSet = await this.authService.refresh({
        refresh_token: refreshToken,
      });
      if (cookieMode) {
        this.cookieSession.setSessionCookies(request, response, tokenSet);
        return { success: true, expires_in: tokenSet.expires_in };
      }
      return tokenSet;
    } catch (error) {
      if (cookieMode && error instanceof UnauthorizedException) {
        this.cookieSession.clearSessionCookies(response);
      }
      throw error;
    }
  } // done

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
  @ApiHeader({
    name: 'X-Lens-Auth-Mode',
    required: false,
    description: 'Gửi giá trị `cookie` để đăng xuất và xóa phiên cookie.',
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
  async logout(
    @Body() body: authDto.AuthLogoutDto = {},
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieMode = isCookieAuthRequest(request);
    const cookieRefreshToken = this.cookieSession.getRefreshToken(request);
    if (cookieMode && cookieRefreshToken) {
      this.cookieSession.assertCsrfToken(request);
    }
    const result = await this.authService.logout({
      refresh_token: cookieMode
        ? (cookieRefreshToken ?? body.refresh_token)
        : body.refresh_token,
    });
    if (cookieMode) this.cookieSession.clearSessionCookies(response);
    return result;
  } // nhưng còn vấn đề nếu access-token còn hạn (xử lý sau)

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
  } // done

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
  } //done

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
  } // done

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
