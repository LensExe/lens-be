import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import type { Actor } from '@shared/database/unit-of-work/unit-of-work.port';
import { Access, Registration } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../responses';
import { IdentityAddDeviceCommand } from '@modules/user/application/commands/identity';
import { IdentityAdminUsersQuery } from '@modules/user/application/queries/identity';
import { IdentityRegisterCommand } from '@modules/user/application/commands/identity';
import { IdentityMeQuery } from '@modules/user/application/queries/identity';
import { IdentityUpdateMeCommand } from '@modules/user/application/commands/identity';
import { IdentityStatusCommand } from '@modules/user/application/commands/identity';
import { IdentitySuspendCommand } from '@modules/user/application/commands/identity';
import { IdentityUnsuspendCommand } from '@modules/user/application/commands/identity';
import { IdentityDeleteDeviceCommand } from '@modules/user/application/commands/identity';
import { IdentityAdminUserQuery } from '@modules/user/application/queries/identity';
import { IdentityGetUserQuery } from '@modules/user/application/queries/identity';

@ApiTags('Identity')
@Controller()
export class IdentityController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
  @Post('users/me/device-tokens')
  @ApiOperation({
    operationId: 'AUTH-005',
    summary: 'Đăng ký device token',
    description:
      'Lưu token thiết bị để nhận push notification. Role: Authenticated',
  })
  @Access([])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: Dto.IdentityAddDeviceCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('AUTH-005'),
  })
  @HttpCode(200)
  addDevice(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.IdentityAddDeviceCommandBodyDto,
  ) {
    return this.commands.execute(
      new IdentityAddDeviceCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Get('admin/users')
  @ApiOperation({
    operationId: 'ADM-002',
    summary: 'Quản lý danh sách user',
    description: 'Tìm kiếm/lọc user. Role: Admin',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'limit',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: 'number',
    description: 'offset',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    description: 'status',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: 'string',
    description: 'keyword',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-002'),
  })
  adminUsers(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.IdentityAdminUsersQueryQueryDto,
  ) {
    return this.queries.execute(
      new IdentityAdminUsersQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }

  @Post('auth/register')
  @ApiOperation({
    operationId: 'AUTH-001',
    summary: 'Đăng ký tài khoản',
    description:
      'Tạo hồ sơ người dùng sau khi đăng ký/xác thực qua IdP. Role: Public',
  })
  @Registration()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: Dto.IdentityRegisterCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('AUTH-001'),
  })
  @HttpCode(200)
  register(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.IdentityRegisterCommandBodyDto,
  ) {
    return this.commands.execute(
      new IdentityRegisterCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Get('users/me')
  @ApiOperation({
    operationId: 'AUTH-002',
    summary: 'Lấy hồ sơ cá nhân',
    description: 'Lấy thông tin người dùng hiện tại. Role: Authenticated',
  })
  @Access([])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('AUTH-002'),
  })
  me(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new IdentityMeQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  @Patch('users/me')
  @ApiOperation({
    operationId: 'AUTH-003',
    summary: 'Cập nhật hồ sơ cá nhân',
    description:
      'Cập nhật tên, avatar, số điện thoại và thông tin cơ bản. Role: Authenticated',
  })
  @Access([])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiBody({ type: Dto.IdentityUpdateMeCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('AUTH-003'),
  })
  updateMe(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.IdentityUpdateMeCommandBodyDto,
  ) {
    return this.commands.execute(
      new IdentityUpdateMeCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Patch('admin/users/:id/status')
  @ApiOperation({
    operationId: 'ADM-004',
    summary: 'Cập nhật trạng thái user',
    description: 'Quản lý trạng thái tài khoản. Role: Admin',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiBody({ type: Dto.IdentityStatusCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-004'),
  })
  status(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.IdentityStatusCommandBodyDto,
  ) {
    return this.commands.execute(
      new IdentityStatusCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  @Post('admin/users/:id/suspend')
  @ApiOperation({
    operationId: 'MOD-006',
    summary: 'Khóa tài khoản',
    description: 'Tạm khóa người dùng theo chính sách. Role: Admin',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MOD-006'),
  })
  @HttpCode(200)
  suspend(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new IdentitySuspendCommand(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Post('admin/users/:id/unsuspend')
  @ApiOperation({
    operationId: 'MOD-007',
    summary: 'Mở khóa tài khoản',
    description: 'Khôi phục tài khoản. Role: Admin',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MOD-007'),
  })
  @HttpCode(200)
  unsuspend(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new IdentityUnsuspendCommand(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Delete('users/me/device-tokens/:tokenId')
  @ApiOperation({
    operationId: 'AUTH-006',
    summary: 'Xóa device token',
    description:
      'Hủy đăng ký push notification cho thiết bị. Role: Authenticated',
  })
  @Access([])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiParam({ name: 'tokenId', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('AUTH-006'),
  })
  deleteDevice(
    @Req() req: { actor?: Actor },
    @Param('tokenId', new ParseUUIDPipe()) tokenId: string,
  ) {
    return this.commands.execute(
      new IdentityDeleteDeviceCommand(req.actor ?? { sub: '', roles: [] }, {
        tokenId,
      }),
    );
  }

  @Get('admin/users/:id')
  @ApiOperation({
    operationId: 'ADM-003',
    summary: 'Chi tiết user',
    description: 'Thông tin quản trị của user. Role: Admin',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-003'),
  })
  adminUser(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new IdentityAdminUserQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Get('users/:id')
  @ApiOperation({
    operationId: 'AUTH-004',
    summary: 'Lấy thông tin người dùng',
    description:
      'Lấy thông tin public/được phép xem của một người dùng. Role: Authenticated',
  })
  @Access([])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({
    description: 'DTO validation or business constraint failed',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiConflictResponse({
    description: 'State transition or uniqueness conflict',
  })
  @ApiServiceUnavailableResponse({
    description: 'External integration is not configured or unavailable',
  })
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('AUTH-004'),
  })
  getUser(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new IdentityGetUserQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }
}
