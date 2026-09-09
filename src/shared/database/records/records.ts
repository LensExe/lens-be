// Persistence-neutral records mapped from the supplied diagram and reviewed additions.
export interface UsersRecord {
  id: string;
  keycloak_id: string;
  fullname: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  gender: string | null;
  dob: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CustomersRecord {
  id: string;
  user_id: string;
  location: string | null;
  created_at: string;
  updated_at: string;
}
export interface AdminsRecord {
  id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface PhotographersRecord {
  id: string;
  user_id: string;
  tax_code: string | null;
  styles: string[];
  experience: number;
  is_verified: boolean;
  approved_by: string | null;
  location: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}
export interface ProfilesRecord {
  id: string;
  photographer_id: string;
  images: string[];
  description: string;
  created_at: string;
  updated_at: string;
}
export interface RatingsRecord {
  id: string;
  photographer_id: string;
  average_rating: number;
  total_feedbacks: number;
  total_bookings: number;
  return_customers: number;
  created_at: string;
  updated_at: string;
}
export interface BookingPlansRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface PhotographerPlansRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  billing_cycle: number;
  created_at: string;
  updated_at: string;
}
export interface FeaturesRecord {
  id: string;
  plan_id: string | null;
  photographer_plan_id: string | null;
  code: string;
  name: string;
  value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface SubscriptionsRecord {
  id: string;
  photographer_id: string | null;
  user_id: string;
  plan_id: string;
  expired_in: string | null;
  status: string;
  auto_renew: boolean;
  price: number;
  billing_cycle: number;
  created_at: string;
  updated_at: string;
}
export interface WorkingSlotsRecord {
  id: string;
  photographer_id: string;
  day: number;
  date: string;
  from: string;
  to: string;
  created_at: string;
  updated_at: string;
}
export interface OfflineSlotsRecord {
  id: string;
  photographer_id: string;
  from: string;
  to: string;
  day: number;
  created_at: string;
  updated_at: string;
}
export interface BookingsRecord {
  id: string;
  customer_id: string;
  photographer_id: string;
  plan_id: string;
  location: string;
  from: string;
  to: string;
  deposit_amount: number;
  total_amount: number;
  status: string;
  gallery_published_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface WalletsRecord {
  id: string;
  user_id: string;
  balance: number;
  frozen_balance: number;
  created_at: string;
  updated_at: string;
}
export interface TransactionsRecord {
  id: string;
  user_id: string;
  transaction_code: string;
  type: string;
  reference_id: string;
  direction: string;
  amount: number;
  concurrency: string;
  status: string;
  payment_gateway: string;
  provider_order_code: number;
  checkout_url: string | null;
  qr_code: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}
export interface PaymentWebhooksRecord {
  id: string;
  provider: string;
  reference: string;
  transaction_id: string;
  created_at: string;
  updated_at: string;
}
export interface RefundRequestsRecord {
  id: string;
  transaction_id: string;
  user_id: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface MediaRecord {
  id: string;
  user_id: string;
  file_key: string;
  file_size: number;
  content_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface PortfoliosRecord {
  id: string;
  photographer_id: string;
  name: string;
  description: string;
  cover_media_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface PortfolioItemsRecord {
  id: string;
  portfolio_id: string;
  media_id: string;
  position: number;
  created_at: string;
  updated_at: string;
}
export interface BookingDeliveriesRecord {
  id: string;
  booking_id: string;
  media_id: string;
  file_key: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}
export interface GalleriesRecord {
  id: string;
  booking_id: string;
  created_at: string;
  updated_at: string;
}
export interface FeedbacksRecord {
  id: string;
  booking_id: string;
  customer_id: string;
  rating: number;
  punctuality_rating: number;
  attitude_rating: number;
  comment: string;
  is_edited: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}
export interface RepliesRecord {
  id: string;
  feedback_id: string;
  comment: string;
  is_visible: boolean;
  is_edited: boolean;
  replied_by: string;
  created_at: string;
  updated_at: string;
}
export interface DeviceTokensRecord {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  created_at: string;
  updated_at: string;
}
export interface BookingTimelineRecord {
  id: string;
  booking_id: string;
  actor_id: string;
  status: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}
export interface DisputesRecord {
  id: string;
  booking_id: string;
  user_id: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface LocationSessionsRecord {
  id: string;
  booking_id: string;
  active: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}
export interface ConversationsRecord {
  id: string;
  booking_id: string;
  customer_user_id: string;
  photographer_user_id: string;
  created_at: string;
  updated_at: string;
}
export interface MessagesRecord {
  id: string;
  conversation_id: string;
  sender_id: string;
  client_message_id: string;
  content: string | null;
  media_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface MessageReadsRecord {
  id: string;
  message_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}
export interface NotificationsRecord {
  id: string;
  user_id: string;
  title: string;
  body: string;
  event_id: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface ReportsRecord {
  id: string;
  user_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  resolution: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}
export interface ReportHistoryRecord {
  id: string;
  report_id: string;
  actor_id: string;
  status: string;
  resolution: string;
  created_at: string;
  updated_at: string;
}
export interface OutboxEventsRecord {
  id: string;
  topic: string;
  recipient_ids: string[];
  payload: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface EntityMap {
  users: UsersRecord;
  customers: CustomersRecord;
  admins: AdminsRecord;
  photographers: PhotographersRecord;
  profiles: ProfilesRecord;
  ratings: RatingsRecord;
  booking_plans: BookingPlansRecord;
  photographer_plans: PhotographerPlansRecord;
  features: FeaturesRecord;
  subscriptions: SubscriptionsRecord;
  working_slots: WorkingSlotsRecord;
  offline_slots: OfflineSlotsRecord;
  bookings: BookingsRecord;
  wallets: WalletsRecord;
  transactions: TransactionsRecord;
  payment_webhooks: PaymentWebhooksRecord;
  refund_requests: RefundRequestsRecord;
  media: MediaRecord;
  portfolios: PortfoliosRecord;
  portfolio_items: PortfolioItemsRecord;
  booking_deliveries: BookingDeliveriesRecord;
  galleries: GalleriesRecord;
  feedbacks: FeedbacksRecord;
  replies: RepliesRecord;
  device_tokens: DeviceTokensRecord;
  booking_timeline: BookingTimelineRecord;
  disputes: DisputesRecord;
  location_sessions: LocationSessionsRecord;
  conversations: ConversationsRecord;
  messages: MessagesRecord;
  message_reads: MessageReadsRecord;
  notifications: NotificationsRecord;
  reports: ReportsRecord;
  report_history: ReportHistoryRecord;
  outbox_events: OutboxEventsRecord;
}
export type TableName = keyof EntityMap;
export const tableColumns: Record<TableName, string[]> = {
  users: [
    'id',
    'keycloak_id',
    'fullname',
    'email',
    'phone_number',
    'avatar_url',
    'gender',
    'dob',
    'status',
    'created_at',
    'updated_at',
  ],
  customers: ['id', 'user_id', 'location', 'created_at', 'updated_at'],
  admins: ['id', 'user_id', 'is_active', 'created_at', 'updated_at'],
  photographers: [
    'id',
    'user_id',
    'tax_code',
    'styles',
    'experience',
    'is_verified',
    'approved_by',
    'location',
    'is_available',
    'created_at',
    'updated_at',
  ],
  profiles: [
    'id',
    'photographer_id',
    'images',
    'description',
    'created_at',
    'updated_at',
  ],
  ratings: [
    'id',
    'photographer_id',
    'average_rating',
    'total_feedbacks',
    'total_bookings',
    'return_customers',
    'created_at',
    'updated_at',
  ],
  booking_plans: [
    'id',
    'code',
    'name',
    'description',
    'price',
    'is_active',
    'created_at',
    'updated_at',
  ],
  photographer_plans: [
    'id',
    'code',
    'name',
    'description',
    'price',
    'is_active',
    'billing_cycle',
    'created_at',
    'updated_at',
  ],
  features: [
    'id',
    'plan_id',
    'photographer_plan_id',
    'code',
    'name',
    'value',
    'is_active',
    'created_at',
    'updated_at',
  ],
  subscriptions: [
    'id',
    'photographer_id',
    'user_id',
    'plan_id',
    'expired_in',
    'status',
    'auto_renew',
    'price',
    'billing_cycle',
    'created_at',
    'updated_at',
  ],
  working_slots: [
    'id',
    'photographer_id',
    'day',
    'date',
    'from',
    'to',
    'created_at',
    'updated_at',
  ],
  offline_slots: [
    'id',
    'photographer_id',
    'from',
    'to',
    'day',
    'created_at',
    'updated_at',
  ],
  bookings: [
    'id',
    'customer_id',
    'photographer_id',
    'plan_id',
    'location',
    'from',
    'to',
    'deposit_amount',
    'total_amount',
    'status',
    'gallery_published_at',
    'created_at',
    'updated_at',
  ],
  wallets: [
    'id',
    'user_id',
    'balance',
    'frozen_balance',
    'created_at',
    'updated_at',
  ],
  transactions: [
    'id',
    'user_id',
    'transaction_code',
    'type',
    'reference_id',
    'direction',
    'amount',
    'concurrency',
    'status',
    'payment_gateway',
    'provider_order_code',
    'checkout_url',
    'qr_code',
    'idempotency_key',
    'created_at',
    'updated_at',
  ],
  payment_webhooks: [
    'id',
    'provider',
    'reference',
    'transaction_id',
    'created_at',
    'updated_at',
  ],
  refund_requests: [
    'id',
    'transaction_id',
    'user_id',
    'amount',
    'reason',
    'status',
    'created_at',
    'updated_at',
  ],
  media: [
    'id',
    'user_id',
    'file_key',
    'file_size',
    'content_type',
    'status',
    'created_at',
    'updated_at',
  ],
  portfolios: [
    'id',
    'photographer_id',
    'name',
    'description',
    'cover_media_id',
    'created_at',
    'updated_at',
  ],
  portfolio_items: [
    'id',
    'portfolio_id',
    'media_id',
    'position',
    'created_at',
    'updated_at',
  ],
  booking_deliveries: [
    'id',
    'booking_id',
    'media_id',
    'file_key',
    'file_size',
    'created_at',
    'updated_at',
  ],
  galleries: ['id', 'booking_id', 'created_at', 'updated_at'],
  feedbacks: [
    'id',
    'booking_id',
    'customer_id',
    'rating',
    'punctuality_rating',
    'attitude_rating',
    'comment',
    'is_edited',
    'is_visible',
    'created_at',
    'updated_at',
  ],
  replies: [
    'id',
    'feedback_id',
    'comment',
    'is_visible',
    'is_edited',
    'replied_by',
    'created_at',
    'updated_at',
  ],
  device_tokens: [
    'id',
    'user_id',
    'token',
    'platform',
    'created_at',
    'updated_at',
  ],
  booking_timeline: [
    'id',
    'booking_id',
    'actor_id',
    'status',
    'reason',
    'created_at',
    'updated_at',
  ],
  disputes: [
    'id',
    'booking_id',
    'user_id',
    'reason',
    'status',
    'created_at',
    'updated_at',
  ],
  location_sessions: [
    'id',
    'booking_id',
    'active',
    'latitude',
    'longitude',
    'created_at',
    'updated_at',
  ],
  conversations: [
    'id',
    'booking_id',
    'customer_user_id',
    'photographer_user_id',
    'created_at',
    'updated_at',
  ],
  messages: [
    'id',
    'conversation_id',
    'sender_id',
    'client_message_id',
    'content',
    'media_id',
    'created_at',
    'updated_at',
  ],
  message_reads: ['id', 'message_id', 'user_id', 'created_at', 'updated_at'],
  notifications: [
    'id',
    'user_id',
    'title',
    'body',
    'event_id',
    'read_at',
    'created_at',
    'updated_at',
  ],
  reports: [
    'id',
    'user_id',
    'target_type',
    'target_id',
    'reason',
    'status',
    'resolution',
    'resolved_by',
    'created_at',
    'updated_at',
  ],
  report_history: [
    'id',
    'report_id',
    'actor_id',
    'status',
    'resolution',
    'created_at',
    'updated_at',
  ],
  outbox_events: [
    'id',
    'topic',
    'recipient_ids',
    'payload',
    'processed_at',
    'created_at',
    'updated_at',
  ],
};
