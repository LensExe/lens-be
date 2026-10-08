import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Actor } from '@shared/platform/auth/actor';
import { Access } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import { IdentityUpdateMeCommand } from '@modules/identity/identity.command';
import {
  IdentityGetUserQuery,
  IdentityMeQuery,
} from '@modules/identity/identity.query';

@ApiTags('User')
@Controller()
export class UserController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  /**
   * Get the current user information from the authenticated identity.
   *
   * @param req HTTP request containing authentication information and request data.
   * @returns Result of the query dispatched to its handler.
   */
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

  /**
   * Update a user after checking permissions and validating the data.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
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

  /**
   * Get user details by ID after checking the caller’s permissions.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('users/:user_id')
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
  @ApiParam({ name: 'user_id', type: String, description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('AUTH-004'),
  })
  getUser(
    @Req() req: { actor?: Actor },
    @Param('user_id', new ParseUUIDPipe()) user_id: string,
  ) {
    return this.queries.execute(
      new IdentityGetUserQuery(req.actor ?? { sub: '', roles: [] }, {
        user_id,
      }),
    );
  }
}
