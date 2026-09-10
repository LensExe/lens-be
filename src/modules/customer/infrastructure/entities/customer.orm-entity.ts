/**
 * Định nghĩa cấu trúc bảng customers trong Database.
 */
export class CustomerOrmEntity {
  id: string;
  userId: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}
