import { randomBytes, randomInt } from 'node:crypto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  KeycloakService,
  KeycloakTokenService,
  KeycloakUserService,
} from '@shared/integrations';
import type { Actor } from '@shared/platform/auth/actor';
import {
  AuthChangePasswordDto,
  AuthLoginQueryDto,
  AuthLogoutDto,
  AuthOtpEvent,
  AuthRefreshDto,
  AuthRegisterCommandBodyDto,
  AuthResetPasswordDto,
  AuthSendOTP,
  AuthVerifyEmailDto,
  AuthVerifyForgotPasswordOtpDto,
} from '../dto';
import { SeparateFullname } from '@shared/integrations/keycloak/utils/separate-fullname';

const OTP_EXPIRED_IN_MINUTES = 5;
const RESET_TOKEN_EXPIRED_IN_MINUTES = 10;
const MAX_SEND_OTP_TIMES = 5;
const MAX_SEND_OTP_EXPIRED_IN_MINUTES = 60;

const OTP_CACHE_KEY_REGEX = new RegExp(
  `^otp:(${Object.values(AuthOtpEvent).join('|')}):[^\\s@]+@[^\\s@]+\\.[^\\s@]+$`,
);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly config: ConfigService,
    private readonly keycloak: KeycloakService,
    private readonly keyCloakUser: KeycloakUserService,
    private readonly tokens: KeycloakTokenService,
  ) {}

  /**
   * Create a Keycloak account with the supplied email and password, then return the tokens and user information.
   *
   * @param body Request body validated against the DTO.
   * @returns Result object containing the fields `tokenSet`, `actor`.
   */
  async registerWithPassword(body: AuthRegisterCommandBodyDto) {
    const { firstName, lastName } = SeparateFullname(body.fullname);

    // register user with Keycloak
    await this.tokens.registerUserWithPassword({
      email: body.email,
      password: body.password,
      firstName,
      lastName,
    });

    // get tokens (access & refresh)
    const tokenSet = await this.tokens.exchangePasswordForToken({
      email: body.email,
      password: body.password,
    });

    // get user info from token
    const claims = await this.keycloak.verifyToken(tokenSet.access_token);
    const actor: Actor = {
      sub: claims.sub,
      email: claims.email,
      name: claims.name,
      roles: claims.roles ?? [],
    };

    return { tokenSet, actor };
  }

  /**
   * Sign in with an email and password, validate the access token, and return the session information.
   *
   * @param body Request body validated against the DTO.
   * @returns Result object containing the fields `tokenSet`, `actor`.
   */
  async loginWithPassword(body: AuthLoginQueryDto) {
    // get tokens (access & refresh)
    const tokenSet = await this.tokens.exchangePasswordForToken({
      email: body.email,
      password: body.password,
    });

    // get user info from token
    const claims = await this.keycloak.verifyToken(tokenSet.access_token);
    const actor: Actor = {
      sub: claims.sub,
      email: claims.email,
      name: claims.name,
      roles: claims.roles ?? [],
    };
    return { tokenSet, actor };
  }

  /**
   * Exchange a refresh token for a new token set; reject the request if the token is invalid.
   *
   * @param body Request body validated against the DTO.
   * @returns Authentication token set.
   * @throws {UnauthorizedException} Thrown when the credentials are invalid or have expired.
   */
  async refresh(body: AuthRefreshDto) {
    try {
      // refresh token
      const tokenSet = await this.tokens.exchangeRefreshTokenForToken({
        refreshToken: body.refresh_token,
      });
      return tokenSet;
    } catch {
      // If the refresh token is expired or invalid, return the standard 401 error.
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  /**
   * Revoke the refresh token if present and complete logout idempotently.
   *
   * @param body Request body validated against the DTO.
   * @returns Result object containing the fields `success`, `message`.
   */
  async logout(body: AuthLogoutDto) {
    try {
      // revoke refresh token
      if (body.refresh_token) {
        await this.tokens.revokeRefreshToken({
          refreshToken: body.refresh_token,
        });
      }
    } catch {
      // Ignore logout errors to keep the operation idempotent.
    }
    return {
      success: true,
      message: 'Đăng xuất thành công',
    };
  }

  /**
   * Change the password after verifying the current password and applying the security policy.
   *
   * @param actor Actor performing the operation; used for role and access checks.
   * @param body Request body validated against the DTO.
   * @returns Result object containing the fields `success`, `message`.
   * @throws {BadRequestException} Thrown when the input data is invalid.
   * @throws {UnauthorizedException} Thrown when the credentials are invalid or have expired.
   */
  async changePassword(actor: Actor, body: AuthChangePasswordDto) {
    if (body.new_password !== body.confirm_password) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }

    try {
      await this.tokens.exchangePasswordForToken({
        email: actor.email || '',
        password: body.current_password,
      });

      await this.keyCloakUser.resetUserPassword(
        actor.sub || '',
        body.new_password,
      );
    } catch {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }

    return {
      success: true,
      message: 'Đổi mật khẩu thành công',
    };
  }

  /**
   * Send an OTP for the requested authentication purpose while enforcing the send limit.
   *
   * @param body Request body validated against the DTO.
   * @returns Result object containing the fields `success`, `message`.
   * @throws {NotFoundException} Thrown when the requested resource does not exist.
   * @throws {BadRequestException} Thrown when the input data is invalid.
   * @throws {ServiceUnavailableException} Thrown when an external service is not configured or is unavailable.
   */
  async sendOTP(body: AuthSendOTP) {
    // Check whether the email exists in Keycloak.
    const user = await this.keyCloakUser.getUserByEmail(body.email);
    if (!user?.id) {
      throw new NotFoundException('Không thể gửi OTP đến tài khoản mail này');
    }

    const countSendTimesKey = `count:send-otp:${body.email}`;
    const countSendTimes =
      await this.cacheManager.get<number>(countSendTimesKey);
    if (countSendTimes && countSendTimes >= MAX_SEND_OTP_TIMES) {
      throw new BadRequestException(
        'Bạn đã gửi quá nhiều OTP, vui lòng thử lại sau',
      );
    } else {
      await this.cacheManager.set(
        countSendTimesKey,
        (countSendTimes ?? 0) + 1,
        MAX_SEND_OTP_EXPIRED_IN_MINUTES * 60,
      );
    }

    // Generate a random six-digit OTP.
    const otp = randomInt(100000, 999999).toString();
    // Cache the OTP by event with a five-minute TTL.
    const otpKey = this.getCacheKey(body.event, body.email);
    await this.cacheManager.set(
      otpKey,
      otp,
      OTP_EXPIRED_IN_MINUTES * 60 * 1000,
    );

    // Get the Notification/Mail microservice URL from the configuration.
    const notificationServiceUrl =
      this.config.get<string>('NOTIFICATION_SERVICE_URL') ??
      'http://localhost:3001';

    try {
      this.logger.log(
        `Gửi OTP [${body.event}] đến microservice cho email: ${body.email}`,
      );

      // Send an HTTP POST to the Notification microservice with the event so it can select a template.
      await axios.post(
        `${notificationServiceUrl}/api/v1/emails/send-otp`,
        {
          to: body.email,
          otp,
          event: body.event,
          expired_in_minutes: OTP_EXPIRED_IN_MINUTES,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );

      return {
        success: true,
        message: 'Mã OTP đã được gửi đến email của bạn',
      };
    } catch (error) {
      this.logger.error(
        `Lỗi khi gọi sang Notification Microservice: ${error instanceof Error ? error.message : error}`,
      );
      throw new ServiceUnavailableException(
        'Dịch vụ gửi email hiện đang bận hoặc không khả dụng, vui lòng thử lại sau',
      );
    }
  }

  /**
   * Verify the OTP used in the password recovery flow.
   *
   * @param body Request body validated against the DTO.
   * @returns Result object containing the fields `success`, `message`, `reset_token`.
   */
  async verifyForgotPasswordOtp(body: AuthVerifyForgotPasswordOtpDto) {
    // Verify the OTP from CacheManager and check the Keycloak user.
    await this.verifyAndConsumeOtp(
      AuthOtpEvent.FORGOT_PASSWORD,
      body.email,
      body.otp,
    );

    // Generate a cryptographically secure, single-use reset token.
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenKey = `reset_password_token:${resetToken}`;

    // Cache the reset-token-to-email mapping with a 10-minute TTL.
    await this.cacheManager.set(
      resetTokenKey,
      body.email.trim().toLowerCase(),
      RESET_TOKEN_EXPIRED_IN_MINUTES * 60 * 1000,
    );

    return {
      success: true,
      message: 'Xác minh mã OTP thành công',
      reset_token: resetToken,
    };
  }

  /**
   * Reset the password after verifying the OTP and password reset token.
   *
   * @param body Request body validated against the DTO.
   * @returns Result object containing the fields `success`, `message`.
   * @throws {BadRequestException} Thrown when the input data is invalid.
   * @throws {NotFoundException} Thrown when the requested resource does not exist.
   */
  async resetPassword(body: AuthResetPasswordDto) {
    // Check that the new password matches the password confirmation.
    if (body.new_password !== body.confirm_password) {
      throw new BadRequestException(
        'Mật khẩu mới và mật khẩu xác nhận không trùng khớp',
      );
    }

    // Get the email from Redis using the reset token.
    const resetTokenKey = `reset_password_token:${body.reset_token}`;
    const email = await this.cacheManager.get<string>(resetTokenKey);
    if (!email) {
      throw new BadRequestException(
        'Mã xác thực đổi mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng thực hiện lại.',
      );
    }

    // Find the Keycloak user by email.
    const user = await this.keyCloakUser.getUserByEmail(email);
    if (!user?.id) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    await Promise.all([
      // Update the password in Keycloak.
      this.keyCloakUser.resetUserPassword(user.id, body.new_password),
      // Delete the reset token after successful use (single use).
      this.cacheManager.del(resetTokenKey),
    ]);

    return {
      success: true,
      message:
        'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
    };
  }

  /**
   * Verify the user email using the supplied OTP.
   *
   * @param actor Actor performing the operation; used for role and access checks.
   * @param body Request body validated against the DTO.
   * @returns Result object containing the fields `success`, `message`.
   */
  async verifyEmail(actor: Actor, body: AuthVerifyEmailDto) {
    // Verify the OTP from CacheManager.
    const result = await this.verifyAndConsumeOtp(
      AuthOtpEvent.VERIFY_EMAIL,
      body.email,
      body.otp,
    );

    // Mark the email as verified in Keycloak.
    if (result) {
      await this.keyCloakUser.setUserEmailVerified(actor.sub || '');
    }

    return {
      success: true,
      message: 'Xác minh email thành công',
    };
  }

  /**
   * Build and validate the CacheManager OTP key format with a regular expression.
   *
   * @param event Event type or event information to process.
   * @param email Email address associated with the operation.
   * @returns Processed key value.
   * @throws {BadRequestException} Thrown when the input data is invalid.
   */
  private getCacheKey(event: AuthOtpEvent, email: string): string {
    const key = `otp:${event}:${email.trim().toLowerCase()}`;
    if (!OTP_CACHE_KEY_REGEX.test(key)) {
      throw new BadRequestException('Định dạng yêu cầu mã OTP không hợp lệ');
    }
    return key;
  }

  /**
   * Shared private helper that verifies an OTP in CacheManager and deletes it after use.
   *
   * @param event Event type or event information to process.
   * @param email Email address associated with the operation.
   * @param otp OTP to verify or consume.
   * @returns Boolean indicating the result of the check or operation.
   * @throws {BadRequestException} Thrown when the input data is invalid.
   */
  private async verifyAndConsumeOtp(
    event: AuthOtpEvent,
    email: string,
    otp: string,
  ) {
    // Get the OTP from CacheManager by event and email.
    const otpKey = this.getCacheKey(event, email);
    const [cachedOtp] = await Promise.all([
      // Get OTP
      this.cacheManager.get<string>(otpKey),
      // Delete the OTP after successful use (single use).
      this.cacheManager.del(otpKey),
    ]);

    if (!cachedOtp || cachedOtp !== otp) {
      throw new BadRequestException(
        'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại mã OTP.',
      );
    }

    if (cachedOtp !== otp) {
      throw new BadRequestException('Mã OTP không chính xác');
    }
    return true;
  }
}
