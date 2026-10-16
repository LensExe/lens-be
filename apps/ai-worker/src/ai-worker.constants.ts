export const AI_REPLY_QUEUE = 'lens-ai-auto-replies';

export interface AiReplyJobData {
  event: import('@modules/ai-assistant').ChatMessageCreatedEvent;
  enqueuedAt: number;
  presenceChecks: number;
}
