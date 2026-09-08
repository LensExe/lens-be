export class PhotographerPlanOrmEntity {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  isActive: boolean;
  billingCycle: string;
  createdAt: Date;
  updatedAt: Date;
}
