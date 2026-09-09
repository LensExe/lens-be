import {
  Body,
  Controller,
  Get,
  Post,
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
import { ChatCreateCommand } from '@modules/chat/application/commands/chat';
import { ChatListQuery } from '@modules/chat/application/queries/chat';
import { ChatAttachmentCommand } from '@modules/chat/application/commands/chat';
import { ChatMessagesQuery } from '@modules/chat/application/queries/chat';

@ApiTags('Chat')
@Controller()
export class ChatController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
  @Post('conversations')
  @ApiOperation({
    operationId: 'CHAT-001',
    summary: 'Tạo conversation',
    description:
      'Tạo conversation giữa customer và photographer. Role: Internal/Core',
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
  @ApiBody({ type: Dto.ChatCreateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CHAT-001'),
  })
  @HttpCode(200)
  create(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.ChatCreateCommandBodyDto,
  ) {
    return this.commands.execute(
      new ChatCreateCommand(req.actor ?? { sub: '', roles: [] }, { ...body }),
    );
  }

  @Get('conversations')
  @ApiOperation({
    operationId: 'CHAT-002',
    summary: 'Danh sách conversation',
    description: 'Danh sách hội thoại của user. Role: Authenticated',
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
    schema: responseSchema('CHAT-002'),
  })
  list(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.ChatListQueryQueryDto,
  ) {
    return this.queries.execute(
      new ChatListQuery(req.actor ?? { sub: '', roles: [] }, { ...query }),
    );
  }

  @Post('conversations/:id/attachments')
  @ApiOperation({
    operationId: 'CHAT-008',
    summary: 'Gửi attachment',
    description: 'Đính kèm media/tài liệu trong chat. Role: Participant',
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
  @ApiBody({ type: Dto.ChatAttachmentCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CHAT-008'),
  })
  @HttpCode(200)
  attachment(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.ChatAttachmentCommandBodyDto,
  ) {
    return this.commands.execute(
      new ChatAttachmentCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    operationId: 'CHAT-003',
    summary: 'Lấy tin nhắn',
    description: 'Phân trang lịch sử tin nhắn. Role: Participant',
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
    schema: responseSchema('CHAT-003'),
  })
  messages(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: Dto.ChatMessagesQueryQueryDto,
  ) {
    return this.queries.execute(
      new ChatMessagesQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
        id,
      }),
    );
  }
}
