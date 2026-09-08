export class ProfileOrmEntity {
  id: string;
  photographerId: string;
  images?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
