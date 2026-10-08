import { Controller, Get, Query, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { Response } from 'express';
import {
  ApiBadGatewayResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/keycloak.guard';
import { GoogleAuthService } from '../auth/google-auth.service';
import {
  GoogleCallbackQuery,
  GoogleExchangeQuery,
} from '../dto/google-auth.dto';
import { responseSchema } from '../swagger';
import { IdentityRegisterCommand } from '@modules/identity/identity.command';

@ApiTags('Authentication')
@Controller('keycloak/google')
export class GoogleAuthController {
  constructor(
    private readonly commands: CommandBus,
    private readonly googleAuth: GoogleAuthService,
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
    const user = await this.commands.execute(
      new IdentityRegisterCommand(actor, {
        fullname: actor.name ?? '',
      }),
    );
    const code = await this.googleAuth.createFrontendHandoff({
      tokenSet,
      user,
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
  @ApiResponse({
    status: 200,
    description: 'Token Keycloak và hồ sơ Lens của người dùng',
    schema: responseSchema('AUTH-008'),
  })
  async exchange(@Query() query: GoogleExchangeQuery) {
    const { tokenSet, user } = await this.googleAuth.consumeFrontendHandoff(
      query.code,
    );
    return { ...tokenSet, user };
  }
}
