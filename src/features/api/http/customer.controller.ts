import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Actor } from '@shared/platform/auth/actor';
import { Access } from '../auth/keycloak.guard';
import { responseSchema } from '../swagger';
import { CustomerUpdateCommand } from '@modules/customer/customers.command';
import {
  CustomerAdminGetQuery,
  CustomerMeQuery,
  CustomerAdminListQuery,
  CustomerMyBookingSummaryQuery,
  CustomerRecommendQuery,
} from '@modules/customer/customers.query';
import {
  CustomerUpdateCommandBodyDto,
  CustomerAdminListQueryQueryDto,
  CustomerRecommendQueryQueryDto,
} from '../dto/customer.dto';

@ApiTags('Customer')
@Controller()
export class CustomerController {
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
  @Get('customers/me')
  @Access([])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'CUST-001',
    summary: 'Xem customer profile của mình',
    description:
      'Trả về customer profile kèm fullname và avatar_url. Role: Authenticated',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CUST-001'),
  })
  me(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new CustomerMeQuery(req.actor ?? { sub: '', roles: [] }, {}),
    );
  }

  /**
   * Update a customer profile after checking ownership and validating the input.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param body Request body validated against the DTO.
   * @returns Result of the command dispatched to its handler.
   */
  @Patch('customers/me')
  @Access([])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'CUST-002',
    summary: 'Cập nhật customer profile',
    description:
      'Cập nhật description, preferred_styles và location của khách hàng. Role: Authenticated',
  })
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
  @ApiBody({ type: CustomerUpdateCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CUST-002'),
  })
  update(
    @Req() req: { actor?: Actor },
    @Body() body: CustomerUpdateCommandBodyDto,
  ) {
    return this.commands.execute(
      new CustomerUpdateCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  /**
   * Get a record’s details with administrator access.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param id ID of the record to process.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('admin/customers/:id')
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'CUST-003',
    summary: 'Admin xem customer profile',
    description:
      'Admin xem customer profile của bất kỳ khách hàng theo customer_id. Role: admin',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  @ApiParam({ name: 'id', type: String, description: 'Customer UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('CUST-003'),
  })
  adminGet(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new CustomerAdminGetQuery(req.actor ?? { sub: '', roles: [] }, {
        customer_id: id,
      }),
    );
  }

  /**
   * List records for the admin view.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('admin/customers')
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'CUST-004',
    summary: 'Admin xem danh sách khách hàng',
    description:
      'Tìm khách hàng theo tên hoặc email, lọc theo khu vực và phân trang. Role: admin',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Admin role or active account required',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách khách hàng (phân trang)',
    schema: responseSchema('CUST-004'),
  })
  adminList(
    @Req() req: { actor?: Actor },
    @Query() query: CustomerAdminListQueryQueryDto,
  ) {
    return this.queries.execute(
      new CustomerAdminListQuery(req.actor ?? { sub: '', roles: [] }, query),
    );
  }

  /**
   * Summarize bookings for the current customer.
   *
   * @param req HTTP request containing authentication information and request data.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('customers/me/summary')
  @Access(['customer'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'CUST-005',
    summary: 'Khách hàng xem thống kê booking của mình',
    description:
      'Trả về số booking tổng, đang chờ, đã hoàn tất và tổng tiền đã thanh toán. Role: customer',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Customer role or active account required',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê booking (số lượng, tổng tiền)',
    schema: responseSchema('CUST-005'),
  })
  myBookingSummary(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new CustomerMyBookingSummaryQuery(
        req.actor ?? { sub: '', roles: [] },
        {},
      ),
    );
  }

  /**
   * Find photographers that match the customer’s supplied filters.
   *
   * @param req HTTP request containing authentication information and request data.
   * @param query Query filters and pagination options.
   * @returns Result of the query dispatched to its handler.
   */
  @Get('customers/me/recommendations')
  @Access(['customer'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'CUST-006',
    summary: 'Gợi ý thợ ảnh cho khách hàng theo profile',
    description:
      'Tìm photographer đã được xác minh theo phong cách và khu vực trong hồ sơ khách hàng, có phân trang. Role: customer',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Customer role or active account required',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thợ ảnh được gợi ý',
    schema: responseSchema('CUST-006'),
  })
  recommend(
    @Req() req: { actor?: Actor },
    @Query() query: CustomerRecommendQueryQueryDto,
  ) {
    return this.queries.execute(
      new CustomerRecommendQuery(req.actor ?? { sub: '', roles: [] }, query),
    );
  }
}
