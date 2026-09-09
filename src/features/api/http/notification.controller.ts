import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
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
import { Access } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../responses';
import { NotificationCreateCommand } from '@modules/notification/application/commands/notifications';
import { NotificationReadAllCommand } from '@modules/notification/application/commands/notifications';
import { NotificationListQuery } from '@modules/notification/application/queries/notifications';
import { NotificationReadCommand } from '@modules/notification/application/commands/notifications';

@ApiTags('Notification')
@Controller()
export class NotificationController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
  @Post('internal/notifications')
  @ApiOperation({
    operationId: 'NOTI-004',
    summary: 'Tạo notification nội bộ',
    description:
      'Endpoint nội bộ nếu dùng synchronous integration. Role: Internal/Core',
  })
  @Access(['internal'])
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
  @ApiBody({ type: Dto.NotificationCreateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('NOTI-004'),
  })
  @HttpCode(200)
  create(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.NotificationCreateCommandBodyDto,
  ) {
    return this.commands.execute(
      new NotificationCreateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Patch('notifications/read-all')
  @ApiOperation({
    operationId: 'NOTI-003',
    summary: 'Đọc tất cả',
    description: 'Đánh dấu toàn bộ thông báo đã đọc. Role: Authenticated',
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
    schema: responseSchema('NOTI-003'),
  })
  readAll(@Req() req: { actor?: Actor }) {
    return this.commands.execute(
      new NotificationReadAllCommand(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  @Get('notifications')
  @ApiOperation({
    operationId: 'NOTI-001',
    summary: 'Danh sách thông báo',
    description: 'Lấy notification center của user. Role: Authenticated',
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
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('NOTI-001'),
  })
  list(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.NotificationListQueryQueryDto,
  ) {
    return this.queries.execute(
      new NotificationListQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }

  @Patch('notifications/:id/read')
  @ApiOperation({
    operationId: 'NOTI-002',
    summary: 'Đánh dấu đã đọc',
    description: 'Đánh dấu notification đã đọc. Role: Authenticated',
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
    schema: responseSchema('NOTI-002'),
  })
  read(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new NotificationReadCommand(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }
}
