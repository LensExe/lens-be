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
import type { Actor } from '@shared/platform/auth/actor';
import { Access, Public } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import { PortfolioCreateCommand } from '@modules/photographer/portfolio/portfolios.command';
import { PortfolioReorderCommand } from '@modules/photographer/portfolio/portfolios.command';
import {
  PortfolioListQuery,
  PortfolioMyListQuery,
} from '@modules/photographer/portfolio/portfolios.query';
import { PortfolioAddCommand } from '@modules/photographer/portfolio/portfolios.command';
import { PortfolioGetQuery } from '@modules/photographer/portfolio/portfolios.query';
import { PortfolioUpdateCommand } from '@modules/photographer/portfolio/portfolios.command';
import { PortfolioRemoveCommand } from '@modules/photographer/portfolio/portfolios.command';
import { PortfolioRemoveItemCommand } from '@modules/photographer/portfolio/portfolios.command';

@ApiTags('Portfolio')
@Controller()
export class PortfolioController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  /**
   * Create a portfolio after validating the input and business rules.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('photographers/me/portfolios')
  @ApiOperation({
    operationId: 'PORT-001',
    summary: 'Tạo portfolio',
    description: 'Tạo album/portfolio mới. Role: Photographer',
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
  @ApiBody({ type: Dto.PortfolioCreateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PORT-001'),
  })
  @HttpCode(200)
  create(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.PortfolioCreateCommandBodyDto,
  ) {
    return this.commands.execute(
      new PortfolioCreateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  /**
   * Update the display order using the supplied list of IDs.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Patch('portfolios/:portfolio_id/items/reorder')
  @ApiOperation({
    operationId: 'PORT-008',
    summary: 'Sắp xếp ảnh portfolio',
    description: 'Cập nhật thứ tự hiển thị ảnh. Role: Photographer',
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
  @ApiParam({
    name: 'portfolio_id',
    type: String,
    description: 'Portfolio UUID',
  })
  @ApiBody({ type: Dto.PortfolioReorderCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PORT-008'),
  })
  reorder(
    @Req() req: { actor?: Actor },
    @Param('portfolio_id', new ParseUUIDPipe()) portfolio_id: string,
    @Body() body: Dto.PortfolioReorderCommandBodyDto,
  ) {
    return this.commands.execute(
      new PortfolioReorderCommand(req.actor ?? { sub: '', roles: [] }, {
        portfolio_item_ids: body.portfolio_item_ids,
        portfolio_id,
      }),
    );
  }

  /** List every portfolio belonging to the authenticated photographer. */
  @Get('photographers/me/portfolios')
  @ApiOperation({
    operationId: 'PORT-009',
    summary: 'Danh sách portfolio của tôi',
    description:
      'Photographer xem portfolio của chính mình, kể cả hồ sơ chưa công khai. Role: Photographer',
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
  @ApiNotFoundResponse({ description: 'Photographer profile not found' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Số portfolio mỗi trang (mặc định 20)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: 'number',
    description: 'Vị trí bắt đầu (mặc định 0)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách portfolio của photographer đang đăng nhập',
    schema: responseSchema('PORT-009'),
  })
  myList(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.PortfolioListQueryQueryDto,
  ) {
    return this.queries.execute(
      new PortfolioMyListQuery(req.actor ?? { sub: '', roles: [] }, {
        limit: query.limit,
        offset: query.offset,
      }),
    );
  }

  /**
   * List portfolios using the supplied query filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('photographers/:photographer_id/portfolios')
  @ApiOperation({
    operationId: 'PORT-002',
    summary: 'Danh sách portfolio',
    description: 'Lấy portfolio public của photographer. Role: Public',
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
  @ApiParam({
    name: 'photographer_id',
    type: String,
    description: 'Photographer UUID',
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
    schema: responseSchema('PORT-002'),
  })
  list(
    @Req() req: { actor?: Actor },
    @Param('photographer_id', new ParseUUIDPipe()) photographer_id: string,
    @Query() query: Dto.PortfolioListQueryQueryDto,
  ) {
    return this.queries.execute(
      new PortfolioListQuery(req.actor ?? { sub: '', roles: [] }, {
        ...query,
        photographer_id,
      }),
    );
  }

  /**
   * Add media to a portfolio after checking ownership and media status.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Post('portfolios/:portfolio_id/items')
  @ApiOperation({
    operationId: 'PORT-006',
    summary: 'Thêm ảnh vào portfolio',
    description: 'Gắn media đã upload vào portfolio. Role: Photographer',
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
  @ApiParam({
    name: 'portfolio_id',
    type: String,
    description: 'Portfolio UUID',
  })
  @ApiBody({ type: Dto.PortfolioAddCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PORT-006'),
  })
  @HttpCode(200)
  add(
    @Req() req: { actor?: Actor },
    @Param('portfolio_id', new ParseUUIDPipe()) portfolio_id: string,
    @Body() body: Dto.PortfolioAddCommandBodyDto,
  ) {
    return this.commands.execute(
      new PortfolioAddCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        portfolio_id,
      }),
    );
  }

  /**
   * Get portfolio details by ID after checking access permissions.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('portfolios/:portfolio_id')
  @ApiOperation({
    operationId: 'PORT-003',
    summary: 'Chi tiết portfolio',
    description: 'Lấy chi tiết một portfolio. Role: Public',
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
  @ApiParam({
    name: 'portfolio_id',
    type: String,
    description: 'Portfolio UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PORT-003'),
  })
  get(
    @Req() req: { actor?: Actor },
    @Param('portfolio_id', new ParseUUIDPipe()) portfolio_id: string,
  ) {
    return this.queries.execute(
      new PortfolioGetQuery(req.actor ?? { sub: '', roles: [] }, {
        portfolio_id,
      }),
    );
  }

  /**
   * Update portfolio details after checking ownership.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Patch('portfolios/:portfolio_id')
  @ApiOperation({
    operationId: 'PORT-004',
    summary: 'Cập nhật portfolio',
    description: 'Sửa tên, mô tả, cover và metadata. Role: Photographer',
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
  @ApiParam({
    name: 'portfolio_id',
    type: String,
    description: 'Portfolio UUID',
  })
  @ApiBody({ type: Dto.PortfolioUpdateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PORT-004'),
  })
  update(
    @Req() req: { actor?: Actor },
    @Param('portfolio_id', new ParseUUIDPipe()) portfolio_id: string,
    @Body() body: Dto.PortfolioUpdateCommandBodyDto,
  ) {
    return this.commands.execute(
      new PortfolioUpdateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        portfolio_id,
      }),
    );
  }

  /**
   * Delete a portfolio or portfolio item after checking ownership.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the command dispatched to its handler.
   */
  @Delete('portfolios/:portfolio_id')
  @ApiOperation({
    operationId: 'PORT-005',
    summary: 'Xóa portfolio',
    description: 'Xóa hoặc archive portfolio. Role: Photographer',
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
  @ApiParam({
    name: 'portfolio_id',
    type: String,
    description: 'Portfolio UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PORT-005'),
  })
  remove(
    @Req() req: { actor?: Actor },
    @Param('portfolio_id', new ParseUUIDPipe()) portfolio_id: string,
  ) {
    return this.commands.execute(
      new PortfolioRemoveCommand(req.actor ?? { sub: '', roles: [] }, {
        portfolio_id,
      }),
    );
  }

  /**
   * Remove media from a portfolio after checking ownership.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param portfolio_id Portfolio UUID.
   * @param portfolio_item_id Portfolio item UUID.
   * @returns Result of the command dispatched to its handler.
   */
  @Delete('portfolios/:portfolio_id/items/:portfolio_item_id')
  @ApiOperation({
    operationId: 'PORT-007',
    summary: 'Xóa ảnh khỏi portfolio',
    description: 'Gỡ media khỏi portfolio. Role: Photographer',
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
  @ApiParam({
    name: 'portfolio_id',
    type: String,
    description: 'Portfolio UUID',
  })
  @ApiParam({
    name: 'portfolio_item_id',
    type: String,
    description: 'Portfolio item UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('PORT-007'),
  })
  removeItem(
    @Req() req: { actor?: Actor },
    @Param('portfolio_id', new ParseUUIDPipe()) portfolio_id: string,
    @Param('portfolio_item_id', new ParseUUIDPipe()) portfolio_item_id: string,
  ) {
    return this.commands.execute(
      new PortfolioRemoveItemCommand(req.actor ?? { sub: '', roles: [] }, {
        portfolio_id,
        portfolio_item_id,
      }),
    );
  }
}
