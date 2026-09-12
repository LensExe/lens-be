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
import type { Actor } from '@shared/platform/auth/actor';
import { Access, Public } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import { PhotographerLocationCommand } from '@modules/photographer/photographers.command';
import { PhotographerStatusCommand } from '@modules/photographer/photographers.command';
import { PhotographerAdminQuery } from '@modules/photographer/photographers.query';
import { PhotographerUpdateCommand } from '@modules/photographer/photographers.command';
import { PhotographerMeQuery } from '@modules/photographer/photographers.query';
import { PhotographerCreateCommand } from '@modules/photographer/photographers.command';
import { PhotographerTopQuery } from '@modules/photographer/photographers.query';
import { PhotographerSearchQuery } from '@modules/photographer/photographers.query';
import { PhotographerGetQuery } from '@modules/photographer/photographers.query';

@ApiTags('Photographer')
@Controller()
export class PhotographerController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
  @Patch('photographers/me/location')
  @ApiOperation({
    operationId: 'PHO-008',
    summary: 'Cập nhật khu vực phục vụ',
    description: 'Cập nhật thành phố/khu vực nhận chụp. Role: Photographer',
  })
  @Access(['photographer'])
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
  @ApiBody({ type: Dto.PhotographerLocationCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PHO-008'),
  })
  location(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.PhotographerLocationCommandBodyDto,
  ) {
    return this.commands.execute(
      new PhotographerLocationCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Patch('photographers/me/status')
  @ApiOperation({
    operationId: 'PHO-004',
    summary: 'Cập nhật trạng thái hoạt động',
    description:
      'Bật/tắt nhận booking hoặc trạng thái hoạt động. Role: Photographer',
  })
  @Access(['photographer'])
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
  @ApiBody({ type: Dto.PhotographerStatusCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PHO-004'),
  })
  status(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.PhotographerStatusCommandBodyDto,
  ) {
    return this.commands.execute(
      new PhotographerStatusCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Get('admin/photographers')
  @ApiOperation({
    operationId: 'ADM-007',
    summary: 'Theo dõi photographer',
    description: 'Danh sách và trạng thái photographer. Role: Admin',
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
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-007'),
  })
  admin(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.PhotographerAdminQueryQueryDto,
  ) {
    return this.queries.execute(
      new PhotographerAdminQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }

  @Patch('photographers/me')
  @ApiOperation({
    operationId: 'PHO-003',
    summary: 'Cập nhật hồ sơ photographer',
    description:
      'Cập nhật bio, địa điểm, thông tin nghề nghiệp. Role: Photographer',
  })
  @Access(['photographer'])
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
  @ApiBody({ type: Dto.PhotographerUpdateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PHO-003'),
  })
  update(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.PhotographerUpdateCommandBodyDto,
  ) {
    return this.commands.execute(
      new PhotographerUpdateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Get('photographers/me')
  @ApiOperation({
    operationId: 'PHO-007',
    summary: 'Lấy hồ sơ photographer hiện tại',
    description: 'Trang quản trị hồ sơ cho photographer. Role: Photographer',
  })
  @Access(['photographer'])
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
    schema: responseSchema('PHO-007'),
  })
  me(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new PhotographerMeQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  @Post('photographers/profile')
  @ApiOperation({
    operationId: 'PHO-001',
    summary: 'Tạo hồ sơ photographer',
    description: 'Tạo hồ sơ nghề nghiệp của photographer. Role: Photographer',
  })
  @Access(['photographer'])
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
  @ApiBody({ type: Dto.PhotographerCreateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PHO-001'),
  })
  @HttpCode(200)
  create(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.PhotographerCreateCommandBodyDto,
  ) {
    return this.commands.execute(
      new PhotographerCreateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Get('photographers/top-rated')
  @ApiOperation({
    operationId: 'PHO-006',
    summary: 'Danh sách photographer nổi bật',
    description:
      'Danh sách photographer được sắp xếp theo rating. Role: Public',
  })
  @Public()
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
    schema: responseSchema('PHO-006'),
  })
  top(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.PhotographerTopQueryQueryDto,
  ) {
    return this.queries.execute(
      new PhotographerTopQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }

  @Get('photographers')
  @ApiOperation({
    operationId: 'PHO-005',
    summary: 'Tìm kiếm photographer',
    description: 'Tìm theo thành phố, từ khóa, rating và bộ lọc. Role: Public',
  })
  @Public()
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
    name: 'location',
    required: false,
    type: 'string',
    description: 'location',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: 'string',
    description: 'keyword',
  })
  @ApiQuery({
    name: 'min_rating',
    required: false,
    type: 'number',
    description: 'min rating',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PHO-005'),
  })
  search(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.PhotographerSearchQueryQueryDto,
  ) {
    return this.queries.execute(
      new PhotographerSearchQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
      }),
    );
  }

  @Get('photographers/:id')
  @ApiOperation({
    operationId: 'PHO-002',
    summary: 'Xem hồ sơ photographer',
    description:
      'Thông tin profile, rating, location, dịch vụ cơ bản. Role: Public',
  })
  @Public()
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
    schema: responseSchema('PHO-002'),
  })
  get(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new PhotographerGetQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }
}
