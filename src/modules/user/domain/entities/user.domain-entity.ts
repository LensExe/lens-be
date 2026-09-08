import { UserStatus } from '../enums/user-status.enum';
import { Gender } from '../enums/gender.enum';

export interface UserProps {
  id: string;
  keycloakId: string;
  fullname: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  gender?: Gender;
  dob?: Date;
  status: UserStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserDomainEntity {
  private readonly _id: string;
  private readonly _keycloakId: string;
  private _fullname: string;
  private _email: string;
  private _phoneNumber?: string;
  private _avatarUrl?: string;
  private _gender?: Gender;
  private _dob?: Date;
  private _status: UserStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UserProps) {
    this._id = props.id;
    this._keycloakId = props.keycloakId;
    this._fullname = props.fullname;
    this._email = props.email;
    this._phoneNumber = props.phoneNumber;
    this._avatarUrl = props.avatarUrl;
    this._gender = props.gender;
    this._dob = props.dob;
    this._status = props.status;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  get keycloakId(): string {
    return this._keycloakId;
  }

  get fullname(): string {
    return this._fullname;
  }

  get email(): string {
    return this._email;
  }

  get phoneNumber(): string | undefined {
    return this._phoneNumber;
  }

  get avatarUrl(): string | undefined {
    return this._avatarUrl;
  }

  get gender(): Gender | undefined {
    return this._gender;
  }

  get dob(): Date | undefined {
    return this._dob;
  }

  get status(): UserStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  activate(): void {
    this._status = UserStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  ban(): void {
    this._status = UserStatus.BANNED;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._status = UserStatus.INACTIVE;
    this._updatedAt = new Date();
  }

  updateProfile(data: {
    fullname?: string;
    phoneNumber?: string;
    avatarUrl?: string;
    gender?: Gender;
    dob?: Date;
  }): void {
    if (data.fullname !== undefined) this._fullname = data.fullname;
    if (data.phoneNumber !== undefined) this._phoneNumber = data.phoneNumber;
    if (data.avatarUrl !== undefined) this._avatarUrl = data.avatarUrl;
    if (data.gender !== undefined) this._gender = data.gender;
    if (data.dob !== undefined) this._dob = data.dob;
    this._updatedAt = new Date();
  }
}
