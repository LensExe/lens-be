import { AdminEntity } from './admin.entity';
import { BookingDeliveryEntity } from './booking-delivery.entity';
import { BookingPlanEntity } from './booking-plan.entity';
import { BookingEntity } from './booking.entity';
import { CustomerEntity } from './customer.entity';
import { FeedbackEntity } from './feedback.entity';
import { MediaEntity } from './media.entity';
import { MediaVariantEntity } from './media-variant.entity';
import { OfflineSlotEntity } from './offline-slot.entity';
import { WorkingHourEntity } from './working-hour.entity';
import { BookingStatusHistoryEntity } from './booking-status-history.entity';
import { BookingCollaboratorEntity } from './booking-collaborator.entity';
import { OutboxEventEntity } from './outbox-event.entity';
import { PaymentWebhookEntity } from './payment-webhook.entity';
import { PaymentEscrowSettlementEntity } from './payment-escrow-settlement.entity';
import { PaymentEscrowExtensionEntity } from './payment-escrow-extension.entity';
import { PaymentRequestDeadlineExtensionEntity } from './payment-request-deadline-extension.entity';
import { PhotographerPlanEntity } from './photographer-plan.entity';
import { PhotographerEntity } from './photographer.entity';
import { PhotographerBadgeEntity } from './photographer-badge.entity';
import { RankEntity } from './rank.entity';
import { BadgeEntity } from './badge.entity';
import { PortfolioEntity } from './portfolio.entity';
import { PhotographerRatingEntity } from './photographer-rating.entity';
import { RefundRequestEntity } from './refund-request.entity';
import { RefundRequestAllocationEntity } from './refund-request-allocation.entity';
import { ReportEvidenceEntity } from './report-evidence.entity';
import { ReportEntity } from './report.entity';
import { ReportStatusHistoryEntity } from './report-status-history.entity';
import { SubscriptionEntity } from './subscription.entity';
import { SubscriptionStatusHistoryEntity } from './subscription-status-history.entity';
import { TransactionEntity } from './transaction.entity';
import { UserEntity } from './user.entity';
import { WalletEntity } from './wallet.entity';
import { WalletLedgerEntity } from './wallet-ledger.entity';

export const databaseEntities = [
  UserEntity,
  CustomerEntity,
  AdminEntity,
  PhotographerEntity,
  PhotographerRatingEntity,
  PhotographerBadgeEntity,
  RankEntity,
  BadgeEntity,
  BookingPlanEntity,
  PhotographerPlanEntity,
  SubscriptionEntity,
  SubscriptionStatusHistoryEntity,
  OfflineSlotEntity,
  WorkingHourEntity,
  BookingStatusHistoryEntity,
  BookingCollaboratorEntity,
  BookingEntity,
  WalletEntity,
  WalletLedgerEntity,
  TransactionEntity,
  PaymentWebhookEntity,
  PaymentEscrowSettlementEntity,
  PaymentEscrowExtensionEntity,
  PaymentRequestDeadlineExtensionEntity,
  RefundRequestEntity,
  RefundRequestAllocationEntity,
  MediaEntity,
  MediaVariantEntity,
  PortfolioEntity,
  BookingDeliveryEntity,
  FeedbackEntity,
  ReportEntity,
  ReportEvidenceEntity,
  ReportStatusHistoryEntity,
  OutboxEventEntity,
];

export const EntitySchemas = {
  users: UserEntity,
  customers: CustomerEntity,
  admins: AdminEntity,
  photographers: PhotographerEntity,
  photographer_ratings: PhotographerRatingEntity,
  photographer_badges: PhotographerBadgeEntity,
  ranks: RankEntity,
  badges: BadgeEntity,
  booking_plans: BookingPlanEntity,
  photographer_plans: PhotographerPlanEntity,
  subscriptions: SubscriptionEntity,
  subscription_status_history: SubscriptionStatusHistoryEntity,
  offline_slots: OfflineSlotEntity,
  working_hours: WorkingHourEntity,
  bookings: BookingEntity,
  booking_status_history: BookingStatusHistoryEntity,
  booking_collaborators: BookingCollaboratorEntity,
  wallets: WalletEntity,
  wallet_ledger: WalletLedgerEntity,
  transactions: TransactionEntity,
  payment_webhooks: PaymentWebhookEntity,
  payment_escrow_settlements: PaymentEscrowSettlementEntity,
  payment_escrow_extensions: PaymentEscrowExtensionEntity,
  payment_request_deadline_extensions: PaymentRequestDeadlineExtensionEntity,
  refund_requests: RefundRequestEntity,
  refund_request_allocations: RefundRequestAllocationEntity,
  media: MediaEntity,
  media_variants: MediaVariantEntity,
  portfolios: PortfolioEntity,
  booking_deliveries: BookingDeliveryEntity,
  feedbacks: FeedbackEntity,
  reports: ReportEntity,
  report_evidences: ReportEvidenceEntity,
  report_status_history: ReportStatusHistoryEntity,
  outbox_events: OutboxEventEntity,
};

export type TableName = keyof typeof EntitySchemas;
export type EntityFor<K extends TableName> = InstanceType<
  (typeof EntitySchemas)[K]
>;
