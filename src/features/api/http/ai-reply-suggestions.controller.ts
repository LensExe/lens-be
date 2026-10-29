import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Actor } from '@shared/platform/auth/actor';
import { PhotographerAiReplySuggestionsQuery } from '@modules/ai-assistant/ai-reply-suggestions.query';
import {
  PhotographerAiAssistantSettingsQuery,
  UpdatePhotographerAiAssistantSettingsCommand,
} from '@modules/ai-assistant/ai-assistant-settings.api';
import {
  CreatePhotographerAiFaqCommand,
  DeletePhotographerAiFaqCommand,
  PhotographerAiFaqsQuery,
  UpdatePhotographerAiFaqCommand,
} from '@modules/ai-assistant/ai-assistant-faqs.api';
import { Access } from '../auth/keycloak.guard';
import * as Dto from '../dto';

@ApiTags('Photographer AI Assistant')
@Controller()
export class AiReplySuggestionsController {
  constructor(
    private readonly queries: QueryBus,
    private readonly commands: CommandBus,
  ) {}

  @Get('photographers/me/ai-assistant')
  @Access(['photographer'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'PHO-AI-002',
    summary: 'Xem cài đặt trợ lý AI',
    description:
      'Trả về cài đặt trợ lý AI của photographer đang đăng nhập; mặc định tắt nếu chưa cấu hình.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cài đặt trợ lý AI',
    type: Dto.PhotographerAiAssistantSettingsDto,
  })
  getSettings(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new PhotographerAiAssistantSettingsQuery(
        req.actor ?? { sub: '', roles: [] },
      ),
    );
  }

  @Patch('photographers/me/ai-assistant')
  @Access(['photographer'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'PHO-AI-003',
    summary: 'Cập nhật cài đặt trợ lý AI',
    description:
      'Bật hoặc tắt trợ lý và tự động gửi; cập nhật hướng dẫn giọng điệu, ngưỡng khớp FAQ cho photographer đang đăng nhập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cài đặt đã cập nhật',
    type: Dto.PhotographerAiAssistantSettingsDto,
  })
  updateSettings(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.PhotographerAiAssistantSettingsPatchDto,
  ) {
    return this.commands.execute(
      new UpdatePhotographerAiAssistantSettingsCommand(
        req.actor ?? { sub: '', roles: [] },
        body,
      ),
    );
  }

  @Get('photographers/me/ai-reply-suggestions')
  @Access(['photographer'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'PHO-AI-001',
    summary: 'Xem lịch sử phản hồi AI',
    description:
      'Trả về bản nháp, handoff và trạng thái auto-reply thuộc photographer đang đăng nhập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách phản hồi AI gần đây',
    type: Dto.PhotographerAiReplySuggestionDto,
    isArray: true,
  })
  list(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new PhotographerAiReplySuggestionsQuery(
        req.actor ?? { sub: '', roles: [] },
      ),
    );
  }

  @Get('photographers/me/ai-assistant/faqs')
  @Access(['photographer'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'PHO-AI-004',
    summary: 'Xem FAQ của trợ lý AI',
    description:
      'Trả về các FAQ thuộc photographer đang đăng nhập, gồm cả FAQ đã tạm tắt.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách FAQ',
    type: Dto.PhotographerAiFaqDto,
    isArray: true,
  })
  listFaqs(@Req() req: { actor?: Actor }) {
    return this.queries.execute(
      new PhotographerAiFaqsQuery(req.actor ?? { sub: '', roles: [] }),
    );
  }

  @Post('photographers/me/ai-assistant/faqs')
  @HttpCode(HttpStatus.OK)
  @Access(['photographer'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'PHO-AI-005',
    summary: 'Thêm FAQ cho trợ lý AI',
    description:
      'Tạo embedding bằng Ollama và lưu FAQ thuộc photographer đang đăng nhập.',
  })
  @ApiResponse({
    status: 200,
    description: 'FAQ đã được thêm',
    type: Dto.PhotographerAiFaqDto,
  })
  createFaq(
    @Req() req: { actor?: Actor },
    @Body() body: Dto.PhotographerAiFaqCreateDto,
  ) {
    return this.commands.execute(
      new CreatePhotographerAiFaqCommand(
        req.actor ?? { sub: '', roles: [] },
        body,
      ),
    );
  }

  @Patch('photographers/me/ai-assistant/faqs/:faq_id')
  @Access(['photographer'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'PHO-AI-006',
    summary: 'Cập nhật FAQ của trợ lý AI',
    description:
      'Chỉnh nội dung, câu hỏi tương đương hoặc trạng thái FAQ; embedding được tạo lại khi đổi câu hỏi.',
  })
  @ApiParam({ name: 'faq_id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'FAQ đã cập nhật',
    type: Dto.PhotographerAiFaqDto,
  })
  updateFaq(
    @Req() req: { actor?: Actor },
    @Param('faq_id', new ParseUUIDPipe()) faqId: string,
    @Body() body: Dto.PhotographerAiFaqPatchDto,
  ) {
    return this.commands.execute(
      new UpdatePhotographerAiFaqCommand(
        req.actor ?? { sub: '', roles: [] },
        faqId,
        body,
      ),
    );
  }

  @Delete('photographers/me/ai-assistant/faqs/:faq_id')
  @Access(['photographer'])
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'PHO-AI-007',
    summary: 'Tạm tắt FAQ của trợ lý AI',
    description:
      'Đánh dấu FAQ không hoạt động để worker không dùng nó khi tìm ngữ cảnh.',
  })
  @ApiParam({ name: 'faq_id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'FAQ đã được tạm tắt',
    type: Dto.PhotographerAiFaqDto,
  })
  deleteFaq(
    @Req() req: { actor?: Actor },
    @Param('faq_id', new ParseUUIDPipe()) faqId: string,
  ) {
    return this.commands.execute(
      new DeletePhotographerAiFaqCommand(
        req.actor ?? { sub: '', roles: [] },
        faqId,
      ),
    );
  }
}
