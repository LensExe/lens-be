import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Actor } from '@shared/platform/auth/actor';
import { Access } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import {
  IdentityAdminBanCommand,
  IdentityStatusCommand,
  IdentitySuspendCommand,
  IdentityUnsuspendCommand,
} from '@modules/identity/identity.command';
import {
  IdentityAdminUserQuery,
  IdentityAdminUsersQuery,
} from '@modules/identity/identity.query';

@ApiTags('Admin')
@Controller()
export class AdminUserController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  /**
   * List users for the admin view.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
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

  /**
   * Get user details with administrator access.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('admin/users/:user_id')
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
  @ApiParam({ name: 'user_id', type: String, description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-003'),
  })
  adminUser(
    @Req() req: { actor?: Actor },
    @Param('user_id', new ParseUUIDPipe()) user_id: string,
  ) {
    return this.queries.execute(
      new IdentityAdminUserQuery(req.actor ?? { sub: '', roles: [] }, {
        user_id,
      }),
    );
  }

  /**
   * Get the current user status with administrator access.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Patch('admin/users/:user_id/status')
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
  @ApiParam({ name: 'user_id', type: String, description: 'User UUID' })
  @ApiBody({ type: Dto.IdentityStatusCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-004'),
  })
  status(
    @Req() req: { actor?: Actor },
    @Param('user_id', new ParseUUIDPipe()) user_id: string,
    @Body() body: Dto.IdentityStatusCommandBodyDto,
  ) {
    return this.commands.execute(
      new IdentityStatusCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        user_id,
      }),
    );
  }

  /**
   * Temporarily suspend a user and update the identity provider status.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('admin/users/:user_id/suspend')
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
  @ApiParam({ name: 'user_id', type: String, description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MOD-006'),
  })
  @HttpCode(200)
  suspend(
    @Req() req: { actor?: Actor },
    @Param('user_id', new ParseUUIDPipe()) user_id: string,
  ) {
    return this.commands.execute(
      new IdentitySuspendCommand(req.actor ?? { sub: '', roles: [] }, {
        user_id,
      }),
    );
  }

  /**
   * Remove a user’s temporary suspension.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('admin/users/:user_id/unsuspend')
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
  @ApiParam({ name: 'user_id', type: String, description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MOD-007'),
  })
  @HttpCode(200)
  unsuspend(
    @Req() req: { actor?: Actor },
    @Param('user_id', new ParseUUIDPipe()) user_id: string,
  ) {
    return this.commands.execute(
      new IdentityUnsuspendCommand(req.actor ?? { sub: '', roles: [] }, {
        user_id,
      }),
    );
  }

  /**
   * Ban a user and revoke access according to the admin policy.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('admin/users/:user_id/ban')
  @ApiOperation({
    operationId: 'ADM-008',
    summary: 'Cấm tài khoản vĩnh viễn',
    description:
      'Cấm tài khoản người dùng vi phạm nghiêm trọng chính sách. Role: Admin',
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
  @ApiParam({ name: 'user_id', type: String, description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-008'),
  })
  @HttpCode(200)
  ban(
    @Req() req: { actor?: Actor },
    @Param('user_id', new ParseUUIDPipe()) user_id: string,
  ) {
    return this.commands.execute(
      new IdentityAdminBanCommand(req.actor ?? { sub: '', roles: [] }, {
        user_id,
      }),
    );
  }
}
