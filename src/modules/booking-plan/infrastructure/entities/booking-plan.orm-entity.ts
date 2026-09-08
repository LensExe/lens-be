export class BookingPlanOrmEntity {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
