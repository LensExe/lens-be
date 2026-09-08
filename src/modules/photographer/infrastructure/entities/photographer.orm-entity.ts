/**
 * Định nghĩa cấu trúc bảng photographers trong Database.
 */
export class PhotographerOrmEntity {
  id: string;
  userId: string;
  taxCode?: string;
  styles?: string;
  experience?: string;
  isVerified: boolean;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
