export class SubscriptionOrmEntity {
  id: string;
  photographerId: string;
  planId: string;
  expiredIn?: Date;
  createdAt: Date;
  updatedAt: Date;
}
