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

  async refresh(body: AuthRefreshDto) {
    try {
      // refresh token
      const tokenSet = await this.tokens.exchangeRefreshTokenForToken({
        refreshToken: body.refresh_token,
      });
      return tokenSet;
    } catch {
      // Khi refresh token hết hạn hoặc không hợp lệ -> Bắn lỗi 401 chuẩn
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  async logout(body: AuthLogoutDto) {
    try {
      // revoke refresh token
      if (body.refresh_token) {
        await this.tokens.revokeRefreshToken({
          refreshToken: body.refresh_token,
        });
      }
    } catch {
      // logout nên bỏ qua lỗi để đảm bảo idempotent
    }
    return {
      success: true,
      message: 'Đăng xuất thành công',
    };
  }

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

  async sendOTP(body: AuthSendOTP) {
    // Kiểm tra email có tồn tại trong KeyCloak hay không
    const user = await this.keyCloakUser.getUserByEmail(body.email);
    if (!user?.id) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    // Sinh mã OTP ngẫu nhiên 6 chữ số
    const otp = randomInt(100000, 999999).toString();

    // Lưu OTP vào cache theo sự kiện (event) với thời hạn sống (TTL) 5 phút
    const otpKey = this.getCacheKey(body.event, body.email);
    await this.cacheManager.set(
      otpKey,
      otp,
      OTP_EXPIRED_IN_MINUTES * 60 * 1000,
    );

    // Lấy URL của Notification / Mail Microservice từ config
    const notificationServiceUrl =
      this.config.get<string>('NOTIFICATION_SERVICE_URL') ??
      'http://localhost:3001';

    try {
      this.logger.log(
        `Gửi OTP [${body.event}] đến microservice cho email: ${body.email}`,
      );

      // Bắn HTTP POST sang Notification Microservice kèm event để bên đó chọn template
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

  async verifyForgotPasswordOtp(body: AuthVerifyForgotPasswordOtpDto) {
    // Xác minh OTP từ CacheManager và kiểm tra user Keycloak
    await this.verifyAndConsumeOtp(
      AuthOtpEvent.FORGOT_PASSWORD,
      body.email,
      body.otp,
    );

    // Tạo reset_token ngẫu nhiên an toàn (one-time reset token)
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenKey = `reset_password_token:${resetToken}`;

    // Lưu reset_token map tới email trong cache với TTL 10 phút
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

  async resetPassword(body: AuthResetPasswordDto) {
    // Kiểm tra mật khẩu mới và mật khẩu xác nhận có khớp không
    if (body.new_password !== body.confirm_password) {
      throw new BadRequestException(
        'Mật khẩu mới và mật khẩu xác nhận không trùng khớp',
      );
    }

    // Lấy email từ Redis dựa trên reset_token
    const resetTokenKey = `reset_password_token:${body.reset_token}`;
    const email = await this.cacheManager.get<string>(resetTokenKey);
    if (!email) {
      throw new BadRequestException(
        'Mã xác thực đổi mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng thực hiện lại.',
      );
    }

    // Tìm user trong Keycloak theo email
    const user = await this.keyCloakUser.getUserByEmail(email);
    if (!user?.id) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    await Promise.all([
      // Cập nhật mật khẩu mới trên Keycloak
      this.keyCloakUser.resetUserPassword(user.id, body.new_password),
      // Xóa reset_token sau khi sử dụng thành công (One-time use)
      this.cacheManager.del(resetTokenKey),
    ]);

    return {
      success: true,
      message:
        'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
    };
  }

  async verifyEmail(actor: Actor, body: AuthVerifyEmailDto) {
    // Xác minh OTP từ CacheManager
    const result = await this.verifyAndConsumeOtp(
      AuthOtpEvent.VERIFY_EMAIL,
      body.email,
      body.otp,
    );

    // Đánh dấu email đã được xác minh trên Keycloak
    if (result) {
      await this.keyCloakUser.setUserEmailVerified(actor.sub || '');
    }

    return {
      success: true,
      message: 'Xác minh email thành công',
    };
  }

  /**
   * Tạo và kiểm tra định dạng key CacheManager cho OTP bằng Regex
   */
  private getCacheKey(event: AuthOtpEvent, email: string): string {
    const key = `otp:${event}:${email.trim().toLowerCase()}`;
    if (!OTP_CACHE_KEY_REGEX.test(key)) {
      throw new BadRequestException('Định dạng yêu cầu mã OTP không hợp lệ');
    }
    return key;
  }

  /**
   * Hàm private dùng chung: Xác minh OTP từ CacheManager, hủy OTP sau khi dùng
   */
  private async verifyAndConsumeOtp(
    event: AuthOtpEvent,
    email: string,
    otp: string,
  ) {
    // Lấy OTP từ CacheManager theo event và email
    const otpKey = this.getCacheKey(event, email);
    const cachedOtp = await this.cacheManager.get<string>(otpKey);
    if (!cachedOtp || cachedOtp !== otp) {
      throw new BadRequestException(
        'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại mã OTP.',
      );
    }

    if (cachedOtp !== otp) {
      throw new BadRequestException('Mã OTP không chính xác');
    }

    // Xóa OTP sau khi sử dụng thành công (One-time use)
    await this.cacheManager.del(otpKey);

    return true;
  }
}
