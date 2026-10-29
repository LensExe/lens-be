import { Controller, Get, Query, Req } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Actor } from '@shared/platform/auth/actor';
import { AdminDashboardAnalyticsQuery } from '@modules/moderation/dashboard/dashboard-analytics.query';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import { Access } from '../auth/keycloak.guard';

@ApiTags('Moderation')
@Controller()
export class AdminDashboardAnalyticsController {
  constructor(private readonly queries: QueryBus) {}

  /** Return trend, breakdown, and activity data for the admin overview. */
  @Get('admin/dashboard/analytics')
  @ApiOperation({
    operationId: 'ADM-017',
    summary: 'Phân tích tổng quan dashboard quản trị',
    description:
      'Trả về xu hướng booking, khoản thu, phân bố theo địa điểm/phong cách và hoạt động gần đây. Role: Admin',
  })
  @Access(['admin'])
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Keycloak access token',
  })
  @ApiForbiddenResponse({
    description: 'Role, ownership or account status denied',
  })
  @ApiBadRequestResponse({ description: 'Invalid months query parameter' })
  @ApiQuery({
    name: 'months',
    required: false,
    type: 'number',
    minimum: 1,
    maximum: 12,
    description: 'Number of recent calendar months to include; defaults to 6',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard analytics',
    schema: responseSchema('ADM-017'),
  })
  dashboardAnalytics(
    @Req() req: { actor?: Actor },
    @Query() query: Dto.AdminDashboardAnalyticsQueryQueryDto,
  ) {
    return this.queries.execute(
      new AdminDashboardAnalyticsQuery(req.actor ?? { sub: '', roles: [] }, {
        months: query.months,
      }),
    );
  }
}
