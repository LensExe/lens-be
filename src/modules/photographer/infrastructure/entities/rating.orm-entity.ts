export class RatingOrmEntity {
  id: string;
  photographerId: string;
  averageRating: number;
  totalFeedbacks: number;
  totalBookings: number;
  returnCustomers: number;
  createdAt: Date;
  updatedAt: Date;
}
