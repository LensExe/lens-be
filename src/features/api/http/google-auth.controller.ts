import { Controller, Get, Query } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
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
import { GoogleCallbackQuery } from '../dto/google-auth.dto';
import { responseSchema } from '../swagger';
import { IdentityRegisterCommand } from '@modules/identity/identity.command';

@ApiTags('Authentication')
@Controller('keycloak/google')
export class GoogleAuthController {
  constructor(
    private readonly commands: CommandBus,
    private readonly googleAuth: GoogleAuthService,
  ) {}

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
    status: 200,
    description: 'Token Keycloak và hồ sơ Lens của người dùng',
    schema: responseSchema('AUTH-008'),
  })
  async callback(@Query() query: GoogleCallbackQuery) {
    const { actor, fullname, tokenSet } = await this.googleAuth.handleCallback(
      query.code,
      query.state,
    );
    const user = await this.commands.execute(
      new IdentityRegisterCommand(actor, { fullname }),
    );
    return { ...tokenSet, user };
  }
}
