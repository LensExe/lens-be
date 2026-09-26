import { AdminEntity } from './admin.entity';
import { BookingDeliveryEntity } from './booking-delivery.entity';
import { BookingPlanEntity } from './booking-plan.entity';
import { BookingEntity } from './booking.entity';
import { CustomerEntity } from './customer.entity';
import { FeedbackEntity } from './feedback.entity';
import { MediaEntity } from './media.entity';
import { OfflineSlotEntity } from './offline-slot.entity';
import { WorkingHourEntity } from './working-hour.entity';
import { BookingStatusHistoryEntity } from './booking-status-history.entity';
import { BookingCollaboratorEntity } from './booking-collaborator.entity';
import { OutboxEventEntity } from './outbox-event.entity';
import { PaymentWebhookEntity } from './payment-webhook.entity';
import { PhotographerPlanEntity } from './photographer-plan.entity';
import { PhotographerEntity } from './photographer.entity';
import { PhotographerBadgeEntity } from './photographer-badge.entity';
import { RankEntity } from './rank.entity';
import { BadgeEntity } from './badge.entity';
import { PortfolioEntity } from './portfolio.entity';
import { RatingEntity } from './rating.entity';
import { RefundRequestEntity } from './refund-request.entity';
import { ReportEntity } from './report.entity';
import { SubscriptionEntity } from './subscription.entity';
import { TransactionEntity } from './transaction.entity';
import { UserEntity } from './user.entity';
import { WalletEntity } from './wallet.entity';

export const databaseEntities = [
  UserEntity,
  CustomerEntity,
  AdminEntity,
  PhotographerEntity,
  RatingEntity,
  PhotographerBadgeEntity,
  RankEntity,
  BadgeEntity,
  BookingPlanEntity,
  PhotographerPlanEntity,
  SubscriptionEntity,
  OfflineSlotEntity,
  WorkingHourEntity,
  BookingStatusHistoryEntity,
  BookingCollaboratorEntity,
  BookingEntity,
  WalletEntity,
  TransactionEntity,
  PaymentWebhookEntity,
  RefundRequestEntity,
  MediaEntity,
  PortfolioEntity,
  BookingDeliveryEntity,
  FeedbackEntity,
  ReportEntity,
  OutboxEventEntity,
];

export const EntitySchemas = {
  users: UserEntity,
  customers: CustomerEntity,
  admins: AdminEntity,
  photographers: PhotographerEntity,
  ratings: RatingEntity,
  photographer_badges: PhotographerBadgeEntity,
  ranks: RankEntity,
  badges: BadgeEntity,
  booking_plans: BookingPlanEntity,
  photographer_plans: PhotographerPlanEntity,
  subscriptions: SubscriptionEntity,
  offline_slots: OfflineSlotEntity,
  working_hours: WorkingHourEntity,
  bookings: BookingEntity,
  booking_status_history: BookingStatusHistoryEntity,
  booking_collaborators: BookingCollaboratorEntity,
  wallets: WalletEntity,
  transactions: TransactionEntity,
  payment_webhooks: PaymentWebhookEntity,
  refund_requests: RefundRequestEntity,
  media: MediaEntity,
  portfolios: PortfolioEntity,
  booking_deliveries: BookingDeliveryEntity,
  feedbacks: FeedbackEntity,
  reports: ReportEntity,
  outbox_events: OutboxEventEntity,
};

export type TableName = keyof typeof EntitySchemas;
export type EntityFor<K extends TableName> = InstanceType<
  (typeof EntitySchemas)[K]
>;
