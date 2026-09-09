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
import { ModerationDashboardQuery } from '@modules/moderation/application/queries/moderation';
import { ModerationListQuery } from '@modules/moderation/application/queries/moderation';
import { ModerationMineQuery } from '@modules/moderation/application/queries/moderation';
import { ModerationCreateCommand } from '@modules/moderation/application/commands/moderation';
import { ModerationResolveCommand } from '@modules/moderation/application/commands/moderation';
import { ModerationGetQuery } from '@modules/moderation/application/queries/moderation';

@ApiTags('Moderation')
@Controller()
export class ModerationController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
  @Get('admin/dashboard')
  @ApiOperation({
    operationId: 'ADM-001',
    summary: 'Dashboard tổng quan',
    description: 'KPI người dùng, booking, doanh thu, report. Role: Admin',
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
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-001'),
  })
  dashboard(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new ModerationDashboardQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  @Get('admin/reports')
  @ApiOperation({
    operationId: 'MOD-003',
    summary: 'Danh sách report',
    description: 'Admin lọc report theo trạng thái/loại/mức độ. Role: Admin',
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
    name: 'target_type',
    required: false,
    type: 'string',
    description: 'target type',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MOD-003'),
  })
  list(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.ModerationListQueryQueryDto,
  ) {
    return this.queries.execute(
      new ModerationListQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }

  @Get('reports/me')
  @ApiOperation({
    operationId: 'MOD-002',
    summary: 'Report của tôi',
    description: 'Theo dõi các report user đã tạo. Role: Authenticated',
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
    schema: responseSchema('MOD-002'),
  })
  mine(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.ModerationMineQueryQueryDto,
  ) {
    return this.queries.execute(
      new ModerationMineQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }

  @Post('reports')
  @ApiOperation({
    operationId: 'MOD-001',
    summary: 'Tạo report',
    description:
      'Báo cáo user, review, booking hoặc nội dung. Role: Authenticated',
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
  @ApiBody({ type: Dto.ModerationCreateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MOD-001'),
  })
  @HttpCode(200)
  create(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.ModerationCreateCommandBodyDto,
  ) {
    return this.commands.execute(
      new ModerationCreateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Post('admin/reports/:id/resolve')
  @ApiOperation({
    operationId: 'MOD-005',
    summary: 'Xử lý report',
    description: 'Resolve/reject/escalate report. Role: Admin',
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
  @ApiBody({ type: Dto.ModerationResolveCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MOD-005'),
  })
  @HttpCode(200)
  resolve(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.ModerationResolveCommandBodyDto,
  ) {
    return this.commands.execute(
      new ModerationResolveCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  @Get('admin/reports/:id')
  @ApiOperation({
    operationId: 'MOD-004',
    summary: 'Chi tiết report',
    description: 'Admin xem evidence và lịch sử xử lý. Role: Admin',
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
    schema: responseSchema('MOD-004'),
  })
  get(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new ModerationGetQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }
}
