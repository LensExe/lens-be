// Application inputs have no dependency on HTTP or validation decorators.
export interface PhotographerLocationCommandInput {
  location: string;
}
export interface PortfolioCreateCommandInput {
  name: string;
  description?: string;
  cover_media_id?: string;
}
export interface PhotographerStatusCommandInput {
  is_available: boolean;
}
export type SubscriptionUsageQueryInput = Record<string, never>;
export interface IdentityAddDeviceCommandInput {
  token: string;
  platform: 'ios' | 'android' | 'web';
}
export interface BookingAdminQueryInput {
  limit?: number;
  offset?: number;
  status?: string;
}
export type ModerationDashboardQueryInput = Record<string, never>;
export interface PaymentAdminQueryInput {
  limit?: number;
  offset?: number;
  status?: string;
}
export interface PhotographerAdminQueryInput {
  limit?: number;
  offset?: number;
}
export interface ModerationListQueryInput {
  limit?: number;
  offset?: number;
  status?: string;
  target_type?: 'user' | 'review' | 'booking' | 'media';
}
export interface IdentityAdminUsersQueryInput {
  limit?: number;
  offset?: number;
  status?: 'active' | 'suspended';
  keyword?: string;
}
export interface IdentityRegisterCommandInput {
  fullname: string;
  location?: string;
}
export interface CalendarCreateCommandInput {
  from: string;
  to: string;
}
export interface CalendarBlockCommandInput {
  from: string;
  to: string;
}
export type CalendarMeQueryInput = Record<string, never>;
export interface NotificationCreateCommandInput {
  user_id: string;
  title: string;
  body: string;
}
export interface MediaCompleteCommandInput {
  media_id: string;
}
export interface MediaUploadCommandInput {
  content_type: 'image/jpeg' | 'image/png' | 'image/webp';
  file_size: number;
}
export type NotificationReadAllCommandInput = Record<string, never>;
export interface PhotographerUpdateCommandInput {
  tax_code?: string;
  styles?: string[];
  experience?: number;
  description?: string;
}
export type PhotographerMeQueryInput = Record<string, never>;
export interface PhotographerCreateCommandInput {
  tax_code?: string;
  styles: string[];
  experience: number;
  location: string;
  description?: string;
}
export interface PhotographerTopQueryInput {
  limit?: number;
  offset?: number;
}
export interface ModerationMineQueryInput {
  limit?: number;
  offset?: number;
}
export type SubscriptionMeQueryInput = Record<string, never>;
export type IdentityMeQueryInput = Record<string, never>;
export interface IdentityUpdateMeCommandInput {
  fullname?: string;
  avatar_url?: string;
  phone_number?: string;
  gender?: 'male' | 'female' | 'other';
  dob?: string;
}
export interface BookingCreateCommandInput {
  photographer_id: string;
  plan_id: string;
  location: string;
  from: string;
  to: string;
}
export interface BookingListQueryInput {
  limit?: number;
  offset?: number;
  status?: string;
  from?: string;
  to?: string;
}
export interface ChatCreateCommandInput {
  booking_id: string;
}
export interface ChatListQueryInput {
  limit?: number;
  offset?: number;
}
export interface NotificationListQueryInput {
  limit?: number;
  offset?: number;
}
export interface PhotographerSearchQueryInput {
  limit?: number;
  offset?: number;
  location?: string;
  keyword?: string;
  min_rating?: number;
}
export type SubscriptionPlansQueryInput = Record<string, never>;
export interface ModerationCreateCommandInput {
  target_type: 'user' | 'review' | 'booking' | 'media';
  target_id: string;
  reason: string;
}
export interface SubscriptionCreateCommandInput {
  plan_id: string;
  idempotency_key: string;
}
export interface ModerationResolveCommandInput {
  id: string;
  status: 'resolved' | 'rejected' | 'escalated';
  resolution: string;
}
export interface IdentityStatusCommandInput {
  id: string;
  status: 'active' | 'suspended';
}
export interface IdentitySuspendCommandInput {
  id: string;
}
export interface IdentityUnsuspendCommandInput {
  id: string;
}
export interface MediaDownloadQueryInput {
  id: string;
}
export interface MediaAddGalleryCommandInput {
  id: string;
  media_id: string;
}
export interface MediaPublishCommandInput {
  id: string;
}
export interface LocationStartCommandInput {
  id: string;
}
export interface LocationStopCommandInput {
  id: string;
}
export interface LocationUpdateCommandInput {
  id: string;
  latitude: number;
  longitude: number;
}
export interface PaymentDepositCommandInput {
  id: string;
  idempotency_key: string;
}
export interface PaymentRemainingCommandInput {
  id: string;
  idempotency_key: string;
}
export interface PortfolioReorderCommandInput {
  id: string;
  item_ids: string[];
}
export interface IdentityDeleteDeviceCommandInput {
  tokenId: string;
}
export interface ModerationGetQueryInput {
  id: string;
}
export interface IdentityAdminUserQueryInput {
  id: string;
}
export interface BookingAcceptCommandInput {
  id: string;
}
export interface BookingCancelCommandInput {
  id: string;
  reason: string;
}
export interface BookingCompleteCommandInput {
  id: string;
}
export interface BookingCompleteShootCommandInput {
  id: string;
}
export interface BookingDisputeCommandInput {
  id: string;
  reason: string;
}
export interface MediaCreateGalleryCommandInput {
  id: string;
}
export interface MediaGalleryQueryInput {
  id: string;
}
export interface LocationGetQueryInput {
  id: string;
}
export interface PaymentHistoryQueryInput {
  id: string;
}
export interface BookingRejectCommandInput {
  id: string;
  reason: string;
}
export interface ReviewCreateCommandInput {
  id: string;
  rating: number;
  punctuality_rating: number;
  attitude_rating: number;
  comment?: string;
}
export interface BookingStartCommandInput {
  id: string;
}
export interface BookingTimelineQueryInput {
  id: string;
}
export interface CalendarUpdateCommandInput {
  slotId: string;
  from: string;
  to: string;
}
export interface CalendarRemoveCommandInput {
  slotId: string;
}
export interface CalendarUnblockCommandInput {
  id: string;
}
export interface ChatAttachmentCommandInput {
  id: string;
  media_id: string;
  client_message_id: string;
  content?: string;
}
export interface ChatMessagesQueryInput {
  id: string;
  limit?: number;
  offset?: number;
}
export interface NotificationReadCommandInput {
  id: string;
}
export interface PaymentQrQueryInput {
  id: string;
}
export interface PaymentRefundCommandInput {
  id: string;
  amount: number;
  reason: string;
}
export interface PaymentRefundsQueryInput {
  id: string;
}
export interface PaymentWebhookCommandInput {
  provider: string;
  payload: Record<string, unknown>;
}
export interface CalendarAvailabilityQueryInput {
  id: string;
  from?: string;
  to?: string;
}
export interface PortfolioListQueryInput {
  id: string;
  limit?: number;
  offset?: number;
}
export interface ReviewSummaryQueryInput {
  id: string;
}
export interface ReviewListQueryInput {
  id: string;
  limit?: number;
  offset?: number;
}
export interface PortfolioAddCommandInput {
  id: string;
  media_id: string;
}
export interface SubscriptionCancelCommandInput {
  id: string;
}
export interface SubscriptionWebhookCommandInput {
  provider: string;
  payload: Record<string, unknown>;
}
export interface BookingGetQueryInput {
  id: string;
}
export interface MediaGetQueryInput {
  id: string;
}
export interface MediaRemoveCommandInput {
  id: string;
}
export interface PaymentGetQueryInput {
  id: string;
}
export interface PhotographerGetQueryInput {
  id: string;
}
export interface PortfolioGetQueryInput {
  id: string;
}
export interface PortfolioUpdateCommandInput {
  id: string;
  name?: string;
  description?: string;
  cover_media_id?: string;
}
export interface PortfolioRemoveCommandInput {
  id: string;
}
export interface ReviewUpdateCommandInput {
  id: string;
  rating?: number;
  punctuality_rating?: number;
  attitude_rating?: number;
  comment?: string;
}
export interface ReviewRemoveCommandInput {
  id: string;
}
export interface IdentityGetUserQueryInput {
  id: string;
}
export interface PortfolioRemoveItemCommandInput {
  id: string;
  itemId: string;
}
