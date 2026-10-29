import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Request, Response } from 'express';
import {
  ApiBadGatewayResponse,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/keycloak.guard';
import { AuthService } from '../auth/auth.service';
import { GoogleAuthService } from '../auth/google-auth.service';
import {
  GoogleCallbackQuery,
  GoogleExchangeQuery,
} from '../dto/google-auth.dto';
import { responseSchema } from '../swagger';
import {
  IdentityRegisterCommand,
  IdentityUpdateMeCommand,
} from '@modules/identity/identity.command';
import { IdentityMeQuery } from '@modules/identity/identity.query';
import {
  AuthCookieSessionService,
  isCookieAuthRequest,
} from '../auth/auth-cookie-session';

@ApiTags('Authentication')
@Controller('keycloak/google')
export class GoogleAuthController {
  constructor(
    private readonly commands: CommandBus,
    private readonly query: QueryBus,
    private readonly googleAuth: GoogleAuthService,
    private readonly auth: AuthService,
    private readonly cookieSession: AuthCookieSessionService,
  ) {}

  /**
   * Build a Google sign-in URL to start the authentication flow.
   *
   * @returns Result object containing the fields `authorization_url`.
   */
  @Get('login')
  @Public()
  @ApiOperation({
    operationId: 'AUTH-007',
    summary: 'Đăng nhập Google thông qua Keycloak',
    description:
      'Khởi tạo Authorization Code + PKCE và chuyển hướng trình duyệt tới Google thông qua Keycloak Identity Broker.',
  })
  @ApiResponse({
    status: 200,
    description: 'URL đăng nhập Google do Keycloak quản lý',
    schema: responseSchema('AUTH-007'),
  })
  @ApiServiceUnavailableResponse({
    description: 'Keycloak hoặc Google callback chưa được cấu hình',
  })
  async login(): Promise<{ authorization_url: string }> {
    return { authorization_url: await this.googleAuth.buildLoginUrl() };
  }

  /**
   * Complete sign-in using the OAuth provider callback data.
   *
   * @param query Query filters and pagination options.
   * @returns Result object containing the fields `user`.
   */
  @Get('callback')
  @Public()
  @ApiOperation({
    operationId: 'AUTH-008',
    summary: 'Nhận callback Google từ Keycloak',
    description:
      'Xác minh state một lần, đổi authorization code lấy token Keycloak và tự động tạo hồ sơ Lens nếu người dùng đăng nhập lần đầu.',
  })
  @ApiQuery({ name: 'code', type: String })
  @ApiQuery({ name: 'state', type: String })
  @ApiBadGatewayResponse({
    description: 'Keycloak từ chối code hoặc lỗi upstream',
  })
  @ApiServiceUnavailableResponse({
    description: 'Keycloak hoặc Google callback chưa được cấu hình',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect về frontend kèm mã handoff dùng một lần',
  })
  async callback(
    @Query() query: GoogleCallbackQuery,
    @Res() response: Response,
  ) {
    const { actor, tokenSet } = await this.googleAuth.handleCallback(
      query.code,
      query.state,
    );
    await this.commands.execute(
      new IdentityRegisterCommand(actor, {
        fullname: actor.name ?? '',
      }),
    );
    let user = await this.query.execute(new IdentityMeQuery(actor, {}));
    const role = user.role;
    if (!role) {
      throw new UnauthorizedException(
        'Google account does not have a customer or photographer profile',
      );
    }

    // Keep a manually selected avatar. Only import Google's picture when the
    // Lens profile does not have an avatar yet.
    if (!user.avatar_url && actor.avatar_url) {
      const avatarUrl = await this.googleAuth.importAvatar(
        actor.avatar_url,
        user.id,
      );
      if (avatarUrl) {
        await this.commands.execute(
          new IdentityUpdateMeCommand(actor, { avatar_url: avatarUrl }),
        );
        user = await this.query.execute(new IdentityMeQuery(actor, {}));
      }
    }
    const sessionTokenSet = await this.auth.synchronizeRole(
      actor,
      tokenSet,
      role,
      { ensureRealmMapping: true },
    );
    const code = await this.googleAuth.createFrontendHandoff({
      tokenSet: sessionTokenSet,
      user,
      roles: actor.roles,
      email_verified: actor.email_verified,
    });
    return response.redirect(302, this.googleAuth.frontendRedirectUri(code));
  }

  @Get('exchange')
  @Public()
  @ApiOperation({
    operationId: 'AUTH-008B',
    summary: 'Đổi mã đăng nhập Google lấy token',
    description: 'Đổi mã handoff dùng một lần lấy token và hồ sơ người dùng.',
  })
  @ApiQuery({ name: 'code', type: String })
  @ApiHeader({
    name: 'X-Lens-Auth-Mode',
    required: false,
    description: 'Gửi giá trị `cookie` để đặt phiên trong cookie HttpOnly.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Hồ sơ Lens; phiên trình duyệt được đặt trong cookie HttpOnly.',
    schema: responseSchema('AUTH-008'),
  })
  async exchange(
    @Query() query: GoogleExchangeQuery,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { tokenSet, user, roles, email_verified } =
      await this.googleAuth.consumeFrontendHandoff(query.code);
    const cookieMode = isCookieAuthRequest(request);
    if (cookieMode) {
      this.cookieSession.setSessionCookies(request, response, tokenSet);
    }
    return {
      ...(cookieMode ? {} : tokenSet),
      user,
      roles,
      email_verified: email_verified ?? false,
      ...(cookieMode ? { expires_in: tokenSet.expires_in } : {}),
    };
  }
}
