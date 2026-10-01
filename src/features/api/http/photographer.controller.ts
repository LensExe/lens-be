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
import {
  PhotographerApproveCommand,
  PhotographerRejectCommand,
} from '@modules/photographer/photographers.command';
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

  /**
   * Update the photographer’s location using the supplied data.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
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

  /**
   * Get the current user status with administrator access.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
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

  /**
   * List records for the admin view using the supplied filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
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
  @ApiQuery({
    name: 'verification_status',
    required: false,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    description: 'verification status',
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

  /**
   * Approve a photographer after checking permissions and the current status.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('admin/photographers/:id/approve')
  @ApiOperation({
    operationId: 'ADM-009',
    summary: 'Duyệt hồ sơ photographer',
    description:
      'Admin duyệt hồ sơ đang chờ; người gửi được gán role photographer. Role: Admin',
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
    schema: responseSchema('ADM-009'),
  })
  @HttpCode(200)
  approve(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new PhotographerApproveCommand(req.actor ?? { sub: '', roles: [] }, {
        photographer_id: id,
      }),
    );
  }

  /**
   * Reject a photographer and record the reason when provided.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('admin/photographers/:id/reject')
  @ApiOperation({
    operationId: 'ADM-010',
    summary: 'Từ chối hồ sơ photographer',
    description:
      'Admin từ chối hồ sơ đang chờ kèm lý do; người gửi sửa và gửi lại được. Role: Admin',
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
  @ApiBody({ type: Dto.PhotographerRejectCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('ADM-010'),
  })
  @HttpCode(200)
  reject(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.PhotographerRejectCommandBodyDto,
  ) {
    return this.commands.execute(
      new PhotographerRejectCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        photographer_id: id,
      }),
    );
  }

  /**
   * Update a photographer profile after checking ownership and validating the input.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
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

  /**
   * Get the current user information from the authenticated identity.
   *
   * @param req HTTP request containing authentication information and request data.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('photographers/me')
  @ApiOperation({
    operationId: 'PHO-007',
    summary: 'Lấy hồ sơ photographer hiện tại',
    description:
      'Hồ sơ thợ của chính mình, gồm trạng thái duyệt và lý do từ chối. Role: Customer, Photographer',
  })
  @Access(['customer', 'photographer'])
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

  /**
   * Create a photographer profile after validating the input and business rules.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('photographers/profile')
  @ApiOperation({
    operationId: 'PHO-001',
    summary: 'Đăng ký làm photographer',
    description:
      'Customer gửi (hoặc gửi lại sau khi bị từ chối) hồ sơ làm thợ; hồ sơ chờ admin duyệt. Role: Customer',
  })
  @Access(['customer'])
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

  /**
   * List featured photographers using the ranking criteria.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
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

  /**
   * Search photographers by keyword, location, and the supplied filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
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

  /**
   * Get photographer details by ID after checking access permissions.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
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
      new PhotographerGetQuery(req.actor ?? { sub: '', roles: [] }, {
        photographer_id: id,
      }),
    );
  }
}
