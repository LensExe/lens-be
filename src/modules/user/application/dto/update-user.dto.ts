import { Gender } from '../../domain/enums/gender.enum';

export class UpdateUserDto {
  fullname?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  gender?: Gender;
  dob?: Date;
}
