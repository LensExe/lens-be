export const SenderKind = {
  USER: 'user',
  AI: 'ai',
} as const;

export type SenderKind = (typeof SenderKind)[keyof typeof SenderKind];

export interface ChatMessageCreatedEvent {
  event_id: string;
  event_type: 'chat.message.created.v1';
  schema_version: 1;
  producer: 'chat-service';
  aggregate_type: 'channel';
  aggregate_id: string;
  data: {
    channel_id: string;
    participant_ids: string[];
    message: {
      id: string;
      channel_id: string;
      sender_id: string;
      sender_kind?: SenderKind;
      type: string;
      content: string;
      seq: number;
      created_at?: string;
    };
  };
}

export interface PhotographerAiContext {
  id: string;
  keycloak_id: string;
  fullname: string;
  description: string;
  location: string;
  styles: string[];
}

export interface AiAssistantSettings {
  enabled: boolean;
  auto_reply_enabled: boolean;
  tone_instructions: string | null;
  min_similarity: number;
}

export interface ConversationHistoryMessage {
  id: string;
  sender_id: string;
  sender_kind: string;
  type: string;
  content: string;
  seq: number;
  reply_to_message_id?: string;
  created_at?: string;
  recalled_at?: string | null;
}

export interface AiKnowledgeItem {
  id: string;
  question: string;
  answer: string;
  alternatives: string[];
  embedding_text: string | null;
  embedding_model: string | null;
}

export interface RetrievedKnowledgeItem {
  id: string;
  question: string;
  answer: string;
  similarity: number;
}

export interface PhotographerBookingPlan {
  name: string;
  description: string | null;
  price: string;
  duration_minutes: number;
  photo_count: number;
  retouched_photo_count: number;
  delivery_days: number | null;
  features: string[];
}

export type AiReplyAction = 'answer' | 'ask_clarification' | 'handoff';

export type AiReplyIntent =
  | 'pricing'
  | 'availability'
  | 'style'
  | 'location'
  | 'delivery'
  | 'booking'
  | 'payment'
  | 'complaint'
  | 'other';

export interface AiReplyDraft {
  action: AiReplyAction;
  intent: AiReplyIntent;
  reply: string;
  risk_flags: string[];
}

export type AiReplySuggestionStatus =
  | 'pending_review'
  | 'handoff'
  | 'generation_failed'
  | 'auto_sent'
  | 'skipped_online'
  | 'superseded';
