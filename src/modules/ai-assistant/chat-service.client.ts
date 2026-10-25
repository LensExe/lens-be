import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ConversationHistoryMessage } from './ai-assistant.types';

export class ChatServiceConflictError extends Error {}

@Injectable()
export class ChatServiceClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = (
      config.get<string>('CHAT_SERVICE_BASE_URL') ?? 'http://lens-chat:8080'
    ).replace(/\/$/, '');
    this.token = config.get<string>('CHAT_SERVICE_AI_TOKEN') ?? '';
    if (
      config.get<string>('AI_AUTO_REPLY_ENABLED')?.trim().toLowerCase() ===
        'true' &&
      !this.token.trim()
    ) {
      throw new Error(
        'CHAT_SERVICE_AI_TOKEN is required when AI_AUTO_REPLY_ENABLED=true',
      );
    }
    this.timeoutMs = Number.parseInt(
      config.get<string>('CHAT_SERVICE_TIMEOUT_MS') ?? '10000',
      10,
    );
  }

  async recentMessages(
    channelId: string,
    photographerId: string,
    limit = 12,
    beforeSequence?: number,
  ): Promise<ConversationHistoryMessage[]> {
    const query = new URLSearchParams({
      photographer_id: photographerId,
      limit: String(limit),
    });
    if (beforeSequence !== undefined) {
      query.set('before_seq', String(beforeSequence));
    }
    const payload = await this.request<{ data?: unknown }>(
      `/internal/v1/chat/channels/${encodeURIComponent(channelId)}/messages?${query}`,
      { method: 'GET' },
    );
    if (!Array.isArray(payload.data)) {
      throw new Error('Chat Service returned an invalid conversation history');
    }
    return payload.data
      .map((value) => this.parseMessage(value))
      .filter((message) => !message.recalled_at && message.type === 'text');
  }

  async sendAIReply(input: {
    channelId: string;
    photographerId: string;
    clientMessageId: string;
    sourceMessageId: string;
    expectedLastSequence: number;
    content: string;
  }): Promise<void> {
    const payload = await this.request<{ data?: unknown }>(
      `/internal/v1/chat/channels/${encodeURIComponent(input.channelId)}/ai-replies`,
      {
        method: 'POST',
        body: JSON.stringify({
          photographer_id: input.photographerId,
          client_message_id: input.clientMessageId,
          source_message_id: input.sourceMessageId,
          // Kept in the request for idempotency compatibility; Chat Service
          // no longer uses this sequence to reject replies to older messages.
          expected_last_seq: input.expectedLastSequence,
          content: input.content,
        }),
      },
      true,
    );
    this.parseMessage(payload.data);
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    conflictIsExpected = false,
  ): Promise<T> {
    if (!this.token.trim()) {
      throw new Error(
        'CHAT_SERVICE_AI_TOKEN is required for automatic replies',
      );
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'X-AI-Worker-Token': this.token,
        ...init.headers,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (conflictIsExpected && response.status === 409) {
      throw new ChatServiceConflictError(
        'Conversation changed before AI reply',
      );
    }
    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      throw new Error(
        `Chat Service returned ${response.status}${responseText ? `: ${responseText.slice(0, 300)}` : ''}`,
      );
    }
    return (await response.json()) as T;
  }

  private parseMessage(value: unknown): ConversationHistoryMessage {
    if (!value || typeof value !== 'object') {
      throw new Error('Chat Service returned a malformed message');
    }
    const message = value as Record<string, unknown>;
    if (
      typeof message.id !== 'string' ||
      typeof message.sender_id !== 'string' ||
      typeof message.type !== 'string' ||
      typeof message.content !== 'string' ||
      typeof message.seq !== 'number' ||
      !Number.isFinite(message.seq)
    ) {
      throw new Error('Chat Service returned a malformed message');
    }
    return {
      id: message.id,
      sender_id: message.sender_id,
      sender_kind:
        typeof message.sender_kind === 'string' ? message.sender_kind : 'user',
      type: message.type,
      content: message.content,
      seq: message.seq,
      ...(typeof message.reply_to_message_id === 'string'
        ? { reply_to_message_id: message.reply_to_message_id }
        : {}),
      ...(typeof message.created_at === 'string'
        ? { created_at: message.created_at }
        : {}),
      ...(typeof message.recalled_at === 'string' ||
      message.recalled_at === null
        ? { recalled_at: message.recalled_at }
        : {}),
    };
  }
}
