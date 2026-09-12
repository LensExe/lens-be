import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Param,
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
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import type { Actor } from '@shared/platform/auth/actor';
import { Access } from '../auth/keycloak.guard';
import * as Dto from '../dto';
import { responseSchema } from '../swagger';
import { MediaCompleteCommand } from '@modules/media/media.command';
import { MediaUploadCommand } from '@modules/media/media.command';
import { MediaDownloadQuery } from '@modules/media/media.query';
import { MediaAddGalleryCommand } from '@modules/media/media.command';
import { MediaPublishCommand } from '@modules/media/media.command';
import { MediaCreateGalleryCommand } from '@modules/media/media.command';
import { MediaGalleryQuery } from '@modules/media/media.query';
import { MediaGetQuery } from '@modules/media/media.query';
import { MediaRemoveCommand } from '@modules/media/media.command';

@ApiTags('Media')
@Controller()
export class MediaController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}
  @Post('media/complete-upload')
  @ApiOperation({
    operationId: 'MEDIA-002',
    summary: 'Xác nhận upload hoàn tất',
    description:
      'Đăng ký metadata sau khi upload thành công. Role: Authenticated',
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
  @ApiBody({ type: Dto.MediaCompleteCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MEDIA-002'),
  })
  @HttpCode(200)
  complete(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.MediaCompleteCommandBodyDto,
  ) {
    return this.commands.execute(
      new MediaCompleteCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
      }),
    );
  }

  @Post('media/upload-url')
  @ApiOperation({
    operationId: 'MEDIA-001',
    summary: 'Tạo signed upload URL',
    description:
      'Cấp URL upload trực tiếp lên object storage. Role: Authenticated',
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
  @ApiBody({ type: Dto.MediaUploadCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MEDIA-001'),
  })
  @HttpCode(200)
  upload(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.MediaUploadCommandBodyDto,
  ) {
    return this.commands.execute(
      new MediaUploadCommand(req.actor ?? { sub: '', roles: [] }, { ...body }),
    );
  }

  @Get('bookings/:id/gallery/download')
  @ApiOperation({
    operationId: 'MEDIA-009',
    summary: 'Tải gallery',
    description: 'Sinh link/package tải ảnh được phép. Role: Customer',
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MEDIA-009'),
  })
  download(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new MediaDownloadQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Post('bookings/:id/gallery/items')
  @ApiOperation({
    operationId: 'MEDIA-006',
    summary: 'Thêm ảnh vào gallery',
    description: 'Gắn ảnh đã upload vào gallery booking. Role: Photographer',
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiBody({ type: Dto.MediaAddGalleryCommandBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MEDIA-006'),
  })
  @HttpCode(200)
  addGallery(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: Dto.MediaAddGalleryCommandBodyDto,
  ) {
    return this.commands.execute(
      new MediaAddGalleryCommand(req.actor ?? { sub: '', roles: [] }, {
        ...body,
        id,
      }),
    );
  }

  @Post('bookings/:id/gallery/publish')
  @ApiOperation({
    operationId: 'MEDIA-008',
    summary: 'Publish gallery',
    description: 'Đánh dấu gallery sẵn sàng cho khách. Role: Photographer',
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MEDIA-008'),
  })
  @HttpCode(200)
  publish(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new MediaPublishCommand(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Post('bookings/:id/gallery')
  @ApiOperation({
    operationId: 'MEDIA-005',
    summary: 'Tạo gallery booking',
    description: 'Tạo khu vực giao ảnh cho khách. Role: Photographer',
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MEDIA-005'),
  })
  @HttpCode(200)
  createGallery(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new MediaCreateGalleryCommand(req.actor ?? { sub: '', roles: [] }, {
        id,
      }),
    );
  }

  @Get('bookings/:id/gallery')
  @ApiOperation({
    operationId: 'MEDIA-007',
    summary: 'Xem gallery',
    description:
      'Customer/photographer xem ảnh thuộc booking. Role: Customer/Photographer',
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
  @ApiParam({ name: 'id', type: String, description: 'Resource UUID' })
  @ApiResponse({
    status: 200,
    description: 'Successful result',
    schema: responseSchema('MEDIA-007'),
  })
  gallery(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new MediaGalleryQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Get('media/:id')
  @ApiOperation({
    operationId: 'MEDIA-003',
    summary: 'Lấy metadata media',
    description: 'Thông tin và signed download/view URL. Role: Authorized',
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
    schema: responseSchema('MEDIA-003'),
  })
  get(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.execute(
      new MediaGetQuery(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }

  @Delete('media/:id')
  @ApiOperation({
    operationId: 'MEDIA-004',
    summary: 'Xóa media',
    description: 'Xóa/soft-delete media theo quyền. Role: Owner',
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
    schema: responseSchema('MEDIA-004'),
  })
  remove(
    @Req() req: { actor?: Actor },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.commands.execute(
      new MediaRemoveCommand(req.actor ?? { sub: '', roles: [] }, { id }),
    );
  }
}
