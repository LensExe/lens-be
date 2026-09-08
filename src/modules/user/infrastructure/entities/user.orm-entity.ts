import { UserStatus } from '../../domain/enums/user-status.enum';
import { Gender } from '../../domain/enums/gender.enum';

/**
 * Định nghĩa cấu trúc bảng users trong Database.
 * Sau này khi tích hợp TypeORM, bạn chỉ cần gắn thêm decorator @Entity('users'), @Column, v.v.
 */
export class UserOrmEntity {
  id: string;
  keycloakId: string;
  fullname: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  gender?: Gender;
  dob?: Date;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
