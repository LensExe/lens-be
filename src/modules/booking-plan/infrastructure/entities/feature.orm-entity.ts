export class FeatureOrmEntity {
  id: string;
  planId: string;
  code: string;
  name: string;
  value?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
