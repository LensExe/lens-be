import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import {
  ChatServiceClient,
  ChatServiceConflictError,
} from './chat-service.client';
import { AiAssistantRepository } from './ai-assistant.repository';
import { OllamaClient } from './ollama.client';
import { PresenceClient } from './presence.client';
import type {
  AiKnowledgeItem,
  AiReplyDraft,
  ChatMessageCreatedEvent,
  PhotographerAiContext,
  PhotographerBookingPlan,
  RetrievedKnowledgeItem,
} from './ai-assistant.types';

class ModelInferenceError extends Error {}

const AI_HANDOFF_ACKNOWLEDGEMENT =
  'Mình đã nhận được tin nhắn của bạn. Nội dung này cần nhiếp ảnh gia xác nhận để đảm bảo thông tin chính xác.';

function aiReplyClientMessageId(eventId: string): string {
  return `ai-${createHash('sha256').update(eventId).digest('hex')}`;
}

function normalizeVietnamese(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

function isBookingPlanQuestion(value: string): boolean {
  const normalized = normalizeVietnamese(value);
  const mentionsPlan = /\b(goi|package|booking plan|dich vu)\b/.test(
    normalized,
  );
  const asksForDetails =
    /\b(gom|bao gom|nhung gi|co gi|bao nhieu|gia|phi|thoi luong|so anh|chinh sua|retouch|bao lau|chi tiet|xem)\b/.test(
      normalized,
    );
  return mentionsPlan && asksForDetails;
}

function isLocationCoverageQuestion(value: string): boolean {
  const normalized = normalizeVietnamese(value);
  return /\b(khu vuc|dia ban|nhan chup|phuc vu|o dau|quan nao|tinh nao|thanh pho nao)\b/.test(
    normalized,
  );
}

function formatServiceAreaReply(location: string): string {
  const serviceArea = location.trim().replace(/\s+/g, ' ').slice(0, 240);
  if (!serviceArea) {
    return 'Hồ sơ hiện chưa ghi rõ khu vực nhận chụp. Bạn cho biết quận/huyện đang quan tâm để nhiếp ảnh gia xác nhận nhé.';
  }
  return `Theo hồ sơ, khu vực phục vụ chính của studio là ${serviceArea}. Hồ sơ chưa liệt kê cụ thể từng quận/huyện, nên nhiếp ảnh gia sẽ xác nhận nếu bạn cần biết một khu vực cụ thể.`;
}

function formatBookingPlanReply(plans: PhotographerBookingPlan[]): string {
  if (plans.length === 0) {
    return 'Hiện chưa có gói chụp nào đang mở bán trên hệ thống. Nhiếp ảnh gia sẽ xác nhận thêm thông tin cho bạn.';
  }

  const blocks: string[] = [];
  for (const plan of plans) {
    const price = /^\d+$/.test(plan.price)
      ? `${BigInt(plan.price).toLocaleString('vi-VN')} ₫`
      : `${plan.price} ₫`;
    const features = Array.isArray(plan.features)
      ? plan.features
          .filter((feature) => typeof feature === 'string' && feature.trim())
          .slice(0, 5)
          .map((feature) => feature.trim().replace(/\s+/g, ' ').slice(0, 120))
      : [];
    const clean = (value: string | null | undefined, maxLength: number) =>
      value?.trim().replace(/\s+/g, ' ').slice(0, maxLength) || '';
    const lines = [
      `• ${clean(plan.name, 160)} — ${price}`,
      clean(plan.description, 280),
      `Thời lượng: ${plan.duration_minutes} phút; ${plan.photo_count} ảnh, gồm ${plan.retouched_photo_count} ảnh chỉnh sửa.`,
      plan.delivery_days === null
        ? ''
        : `Thời gian giao ảnh: ${plan.delivery_days} ngày.`,
      features.length > 0 ? `Bao gồm: ${features.join('; ')}.` : '',
    ].filter(Boolean);
    const block = lines.join('\n');
    if (blocks.join('\n\n').length + block.length > 8500) break;
    blocks.push(block);
  }

  const omitted = plans.length - blocks.length;
  return [
    'Các gói chụp đang mở bán:',
    blocks.join('\n\n'),
    omitted > 0
      ? `Còn ${omitted} gói khác; bạn có thể hỏi tên gói muốn xem.`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);

  constructor(
    private readonly repository: AiAssistantRepository,
    private readonly ollama: OllamaClient,
    private readonly presence: PresenceClient,
    private readonly chat: ChatServiceClient,
    private readonly config: ConfigService,
  ) {}

  async processAutoReply(
    event: ChatMessageCreatedEvent,
    enqueuedAt: number,
  ): Promise<boolean> {
    const message = event.data.message;
    const context = this.eventContext(event);
    if (
      !this.readBoolean('AI_WORKER_ENABLED', false) ||
      !this.readBoolean('AI_AUTO_REPLY_ENABLED', false)
    ) {
      this.logger.warn(
        `AI event skipped ${context} reason=global_auto_reply_disabled workerEnabled=${this.readBoolean('AI_WORKER_ENABLED', false)} autoReplyEnabled=${this.readBoolean('AI_AUTO_REPLY_ENABLED', false)}`,
      );
      return false;
    }
    if (await this.repository.hasProcessedEvent(event.event_id)) {
      this.logger.log(`AI event skipped ${context} reason=already_processed`);
      return false;
    }

    const photographer = await this.repository.findPhotographer(
      event.data.participant_ids,
    );
    if (!photographer) {
      this.logger.warn(
        `AI event skipped ${context} reason=no_single_verified_photographer_match participantCount=${event.data.participant_ids.length}`,
      );
      return false;
    }
    if (message.sender_id === photographer.keycloak_id) {
      this.logger.log(
        `AI event skipped ${context} reason=message_sent_by_photographer`,
      );
      return false;
    }

    const settings = await this.repository.findSettings(photographer.id);
    if (!settings?.enabled || !settings.auto_reply_enabled) {
      this.logger.warn(
        `AI event skipped ${context} reason=photographer_ai_settings_disabled settingsFound=${Boolean(settings)} enabled=${settings?.enabled ?? false} autoReplyEnabled=${settings?.auto_reply_enabled ?? false}`,
      );
      return false;
    }

    if (message.type !== 'text' || !message.content.trim()) {
      return this.sendHandoffAcknowledgement(event, photographer, enqueuedAt, {
        intent: 'other',
        knowledge: [],
        riskFlags: ['unsupported_message_type'],
      });
    }

    this.logger.log(
      `AI event accepted ${context} photographerId=${photographer.id} messageType=text`,
    );

    const conversationHistory = await this.chat.recentMessages(
      event.data.channel_id,
      photographer.keycloak_id,
      11,
      message.seq,
    );
    this.logger.log(
      `AI context loaded ${context} conversationHistoryCount=${conversationHistory.length}`,
    );

    if (
      await this.supersedeIfConversationMovedOn(
        event,
        photographer,
        'other',
        [],
      )
    ) {
      return false;
    }

    // Keep only the latest unanswered customer message in a burst. Older
    // queued events are marked superseded instead of sending stale replies.
    if (await this.presence.isOnline(photographer.keycloak_id)) {
      return this.deferOrSkipOnline(
        event,
        photographer.id,
        enqueuedAt,
        'other',
        [],
      );
    }

    if (isLocationCoverageQuestion(message.content)) {
      const location = photographer.location.trim();
      this.logger.log(
        `AI service area answered ${context} locationAvailable=${Boolean(location)}`,
      );
      return this.sendReply(
        event,
        photographer,
        enqueuedAt,
        {
          action: location ? 'answer' : 'ask_clarification',
          intent: 'location',
          reply: formatServiceAreaReply(location),
          risk_flags: [],
        },
        [],
      );
    }

    const plans = await this.repository.findActiveBookingPlans(photographer.id);
    this.logger.log(
      `AI booking plans loaded ${context} activePlanCount=${plans.length}`,
    );
    if (isBookingPlanQuestion(message.content)) {
      const reply = formatBookingPlanReply(plans);
      this.logger.log(
        `AI booking plans answered ${context} activePlanCount=${plans.length}`,
      );
      return this.sendReply(
        event,
        photographer,
        enqueuedAt,
        { action: 'answer', intent: 'booking', reply, risk_flags: [] },
        [],
      );
    }

    const items = await this.repository.findActiveKnowledge(photographer.id);
    this.logger.log(
      `AI knowledge loaded ${context} activeKnowledgeCount=${items.length} minSimilarity=${settings.min_similarity}`,
    );
    let queryEmbedding: number[] = [];
    if (items.length > 0) {
      try {
        queryEmbedding = (
          await this.ollama.embed(
            [message.content],
            event.event_id,
            'customer_query_embedding',
          )
        )[0];
      } catch (error) {
        return this.handleGenerationFailure(
          event,
          photographer,
          enqueuedAt,
          [],
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    let knowledge: RetrievedKnowledgeItem[] = [];
    try {
      knowledge =
        items.length > 0
          ? await this.retrieve(
              photographer.id,
              items,
              queryEmbedding,
              event.event_id,
            )
          : [];
    } catch (error) {
      if (error instanceof ModelInferenceError) {
        return this.handleGenerationFailure(
          event,
          photographer,
          enqueuedAt,
          [],
          error,
        );
      }
      throw error;
    }
    const groundedKnowledge = knowledge.filter(
      (item) => item.similarity >= settings.min_similarity,
    );
    let draft: AiReplyDraft;
    try {
      draft = await this.ollama.draftReply({
        eventId: event.event_id,
        photographer,
        plans,
        customerMessage: message.content,
        conversationHistory,
        knowledge: groundedKnowledge,
        toneInstructions: settings.tone_instructions,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return this.handleGenerationFailure(
        event,
        photographer,
        enqueuedAt,
        groundedKnowledge,
        error,
      );
    }

    this.logger.log(
      `AI draft ready ${context} action=${draft.action} intent=${draft.intent} riskFlagCount=${draft.risk_flags.length} groundedKnowledgeCount=${groundedKnowledge.length}`,
    );

    if (
      draft.action === 'handoff' ||
      !draft.reply ||
      draft.risk_flags.length > 0
    ) {
      const riskFlags =
        draft.risk_flags.length > 0
          ? draft.risk_flags
          : [
              draft.action === 'handoff'
                ? 'model_requested_handoff'
                : 'empty_model_reply',
            ];
      return this.sendHandoffAcknowledgement(event, photographer, enqueuedAt, {
        intent: draft.intent,
        knowledge: groundedKnowledge,
        riskFlags,
      });
    }

    return this.sendReply(
      event,
      photographer,
      enqueuedAt,
      draft,
      groundedKnowledge,
    );
  }

  private async sendReply(
    event: ChatMessageCreatedEvent,
    photographer: PhotographerAiContext,
    enqueuedAt: number,
    draft: AiReplyDraft,
    knowledge: RetrievedKnowledgeItem[],
  ): Promise<boolean> {
    const message = event.data.message;
    const context = this.eventContext(event);
    if (
      await this.supersedeIfConversationMovedOn(
        event,
        photographer,
        draft.intent,
        knowledge,
      )
    ) {
      return false;
    }
    if (await this.presence.isOnline(photographer.keycloak_id)) {
      return this.deferOrSkipOnline(
        event,
        photographer.id,
        enqueuedAt,
        draft.intent,
        knowledge,
      );
    }

    try {
      this.logger.log(
        `Sending AI reply to Chat Service ${context} action=${draft.action}`,
      );
      await this.chat.sendAIReply({
        channelId: event.data.channel_id,
        photographerId: photographer.keycloak_id,
        clientMessageId: aiReplyClientMessageId(event.event_id),
        sourceMessageId: message.id,
        expectedLastSequence: message.seq,
        content: draft.reply,
      });
    } catch (error) {
      if (!(error instanceof ChatServiceConflictError)) throw error;
      await this.saveOutcome(event, photographer.id, {
        action: 'handoff',
        intent: draft.intent,
        reply: draft.reply,
        similarity: knowledge[0]?.similarity ?? null,
        knowledgeIds: knowledge.map((item) => item.id),
        riskFlags: ['source_message_unavailable'],
        status: 'handoff',
      });
      this.logger.warn(
        `AI reply not sent ${context} reason=chat_service_conflict`,
      );
      return false;
    }

    await this.saveOutcome(event, photographer.id, {
      action: draft.action,
      intent: draft.intent,
      reply: draft.reply,
      similarity: knowledge[0]?.similarity ?? null,
      knowledgeIds: knowledge.map((item) => item.id),
      riskFlags: draft.risk_flags,
      status: 'auto_sent',
    });
    this.logger.log(
      `AI reply sent ${context} photographerId=${photographer.id} action=${draft.action} intent=${draft.intent}`,
    );
    return false;
  }

  private async supersedeIfConversationMovedOn(
    event: ChatMessageCreatedEvent,
    photographer: PhotographerAiContext,
    intent: string,
    knowledge: RetrievedKnowledgeItem[],
  ): Promise<boolean> {
    const message = event.data.message;
    const recentMessages = await this.chat.recentMessages(
      event.data.channel_id,
      photographer.keycloak_id,
      30,
    );
    const newerCustomerMessage = recentMessages.some(
      (item) =>
        item.seq > message.seq &&
        item.sender_id !== photographer.keycloak_id &&
        item.sender_kind !== 'ai',
    );
    const replyAlreadyExists = recentMessages.some(
      (item) =>
        item.reply_to_message_id === message.id &&
        (item.sender_id === photographer.keycloak_id ||
          item.sender_kind === 'ai'),
    );
    if (!newerCustomerMessage && !replyAlreadyExists) return false;

    const riskFlags = [
      ...(newerCustomerMessage ? ['superseded_by_newer_customer_message'] : []),
      ...(replyAlreadyExists ? ['source_message_already_replied_to'] : []),
    ];
    await this.saveOutcome(event, photographer.id, {
      action: 'handoff',
      intent,
      reply: null,
      similarity: knowledge[0]?.similarity ?? null,
      knowledgeIds: knowledge.map((item) => item.id),
      riskFlags,
      status: 'superseded',
    });
    this.logger.log(
      `AI reply skipped ${this.eventContext(event)} reason=${riskFlags.join(',')}`,
    );
    return true;
  }

  private async deferOrSkipOnline(
    event: ChatMessageCreatedEvent,
    photographerId: string,
    enqueuedAt: number,
    intent: string,
    knowledge: RetrievedKnowledgeItem[],
  ): Promise<boolean> {
    const maxWaitMs = this.readInteger(
      'AI_OFFLINE_REPLY_MAX_WAIT_MS',
      600000,
      0,
      3600000,
    );
    const elapsedMs = Date.now() - enqueuedAt;
    if (elapsedMs < maxWaitMs) {
      this.logger.log(
        `AI reply deferred eventId=${event.event_id} messageId=${event.data.message.id} reason=photographer_online elapsedMs=${elapsedMs} maxWaitMs=${maxWaitMs}`,
      );
      return true;
    }
    await this.saveOutcome(event, photographerId, {
      action: 'handoff',
      intent,
      reply: null,
      similarity: knowledge[0]?.similarity ?? null,
      knowledgeIds: knowledge.map((item) => item.id),
      riskFlags: ['photographer_remained_online'],
      status: 'skipped_online',
    });
    this.logger.warn(
      `AI reply skipped eventId=${event.event_id} messageId=${event.data.message.id} reason=photographer_remained_online elapsedMs=${elapsedMs}`,
    );
    return false;
  }

  private async handleGenerationFailure(
    event: ChatMessageCreatedEvent,
    photographer: PhotographerAiContext,
    enqueuedAt: number,
    knowledge: RetrievedKnowledgeItem[],
    error: Error,
  ): Promise<boolean> {
    const failureReason = error.message.slice(0, 500);
    this.logger.error(
      `Could not generate an AI reply for event ${event.event_id}: ${failureReason}`,
    );
    return this.sendHandoffAcknowledgement(event, photographer, enqueuedAt, {
      intent: 'other',
      knowledge,
      riskFlags: ['generation_failed'],
      failureReason,
    });
  }

  private async sendHandoffAcknowledgement(
    event: ChatMessageCreatedEvent,
    photographer: PhotographerAiContext,
    enqueuedAt: number,
    outcome: {
      intent: string;
      knowledge: RetrievedKnowledgeItem[];
      riskFlags: string[];
      failureReason?: string;
    },
  ): Promise<boolean> {
    if (
      await this.supersedeIfConversationMovedOn(
        event,
        photographer,
        outcome.intent,
        outcome.knowledge,
      )
    ) {
      return false;
    }
    if (await this.presence.isOnline(photographer.keycloak_id)) {
      return this.deferOrSkipOnline(
        event,
        photographer.id,
        enqueuedAt,
        outcome.intent,
        outcome.knowledge,
      );
    }

    const message = event.data.message;
    const context = this.eventContext(event);
    const riskFlags = [...new Set(outcome.riskFlags)];
    try {
      await this.chat.sendAIReply({
        channelId: event.data.channel_id,
        photographerId: photographer.keycloak_id,
        clientMessageId: aiReplyClientMessageId(event.event_id),
        sourceMessageId: message.id,
        expectedLastSequence: message.seq,
        content: AI_HANDOFF_ACKNOWLEDGEMENT,
      });
    } catch (error) {
      if (!(error instanceof ChatServiceConflictError)) throw error;
      const conflictRiskFlags = [
        ...new Set([...riskFlags, 'source_message_unavailable']),
      ];
      await this.saveOutcome(event, photographer.id, {
        action: 'handoff',
        intent: outcome.intent,
        reply: null,
        similarity: outcome.knowledge[0]?.similarity ?? null,
        knowledgeIds: outcome.knowledge.map((item) => item.id),
        riskFlags: conflictRiskFlags,
        status: 'handoff',
        failureReason: outcome.failureReason ?? null,
      });
      this.logger.warn(
        `AI acknowledgement not sent ${context} reason=chat_service_conflict riskFlags=${JSON.stringify(conflictRiskFlags)}`,
      );
      return false;
    }

    await this.saveOutcome(event, photographer.id, {
      action: 'handoff',
      intent: outcome.intent,
      reply: AI_HANDOFF_ACKNOWLEDGEMENT,
      similarity: outcome.knowledge[0]?.similarity ?? null,
      knowledgeIds: outcome.knowledge.map((item) => item.id),
      riskFlags,
      status: 'auto_sent',
      failureReason: outcome.failureReason ?? null,
    });
    this.logger.warn(
      `AI handoff acknowledgement sent ${context} intent=${outcome.intent} riskFlags=${JSON.stringify(riskFlags)}`,
    );
    return false;
  }

  private async saveOutcome(
    event: ChatMessageCreatedEvent,
    photographerId: string,
    outcome: {
      action: 'answer' | 'ask_clarification' | 'handoff';
      intent: string;
      reply: string | null;
      similarity: number | null;
      knowledgeIds: string[];
      riskFlags: string[];
      status:
        | 'handoff'
        | 'generation_failed'
        | 'auto_sent'
        | 'skipped_online'
        | 'superseded';
      failureReason?: string | null;
    },
  ): Promise<void> {
    await this.repository.saveSuggestion({
      event,
      photographerId,
      action: outcome.action,
      intent: outcome.intent,
      reply: outcome.reply,
      similarity: outcome.similarity,
      knowledgeIds: outcome.knowledgeIds,
      riskFlags: outcome.riskFlags,
      status: outcome.status,
      failureReason: outcome.failureReason,
    });
  }

  private eventContext(event: ChatMessageCreatedEvent): string {
    return `eventId=${event.event_id} messageId=${event.data.message.id} channelId=${event.data.channel_id}`;
  }

  private readBoolean(name: string, fallback: boolean): boolean {
    const raw = this.config.get<string>(name)?.trim().toLowerCase();
    if (!raw) return fallback;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    throw new Error(`${name} must be true or false`);
  }

  private readInteger(
    name: string,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const raw = this.config.get<string>(name);
    const value = raw ? Number(raw) : fallback;
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`${name} must be between ${min} and ${max}`);
    }
    return value;
  }

  private async retrieve(
    photographerId: string,
    items: AiKnowledgeItem[],
    queryEmbedding: number[],
    eventId: string,
  ): Promise<RetrievedKnowledgeItem[]> {
    const modelName = this.ollama.embeddingModelName;
    const staleItems = items.filter(
      (item) => !item.embedding_text || item.embedding_model !== modelName,
    );
    if (staleItems.length > 0) {
      let vectors: number[][];
      try {
        vectors = await this.ollama.embed(
          staleItems.map((item) =>
            [item.question, ...item.alternatives].filter(Boolean).join('\n'),
          ),
          eventId,
          'faq_reindex_embedding',
        );
      } catch (error) {
        throw new ModelInferenceError(
          error instanceof Error ? error.message : String(error),
        );
      }
      await Promise.all(
        staleItems.map((item, index) =>
          this.repository.saveKnowledgeEmbedding(
            item.id,
            vectors[index],
            modelName,
          ),
        ),
      );
    }
    return this.repository.findRelevantKnowledge(
      photographerId,
      queryEmbedding,
      modelName,
      5,
    );
  }
}
