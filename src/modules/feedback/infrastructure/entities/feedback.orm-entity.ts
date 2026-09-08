export class FeedbackOrmEntity {
  id: string;
  bookingId: string;
  customerId: string;
  rating: number;
  punctualityRating?: number;
  attitudeRating?: number;
  comment?: string;
  isEdited: boolean;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}
