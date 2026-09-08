export interface PhotographerProps {
  id: string;
  userId: string;
  taxCode?: string;
  styles?: string;
  experience?: string;
  isVerified: boolean;
  approvedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PhotographerDomainEntity {
  private readonly _id: string;
  private readonly _userId: string;
  private _taxCode?: string;
  private _styles?: string;
  private _experience?: string;
  private _isVerified: boolean;
  private _approvedBy?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PhotographerProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._taxCode = props.taxCode;
    this._styles = props.styles;
    this._experience = props.experience;
    this._isVerified = props.isVerified;
    this._approvedBy = props.approvedBy;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get userId(): string {
    return this._userId;
  }
  get taxCode(): string | undefined {
    return this._taxCode;
  }
  get styles(): string | undefined {
    return this._styles;
  }
  get experience(): string | undefined {
    return this._experience;
  }
  get isVerified(): boolean {
    return this._isVerified;
  }
  get approvedBy(): string | undefined {
    return this._approvedBy;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  approve(adminId: string): void {
    if (this._isVerified) {
      throw new Error('Photographer is already verified.');
    }
    this._isVerified = true;
    this._approvedBy = adminId;
    this._updatedAt = new Date();
  }

  revokeVerification(): void {
    this._isVerified = false;
    this._approvedBy = undefined;
    this._updatedAt = new Date();
  }

  updateInfo(data: {
    taxCode?: string;
    styles?: string;
    experience?: string;
  }): void {
    if (data.taxCode !== undefined) this._taxCode = data.taxCode;
    if (data.styles !== undefined) this._styles = data.styles;
    if (data.experience !== undefined) this._experience = data.experience;
    this._updatedAt = new Date();
  }
}
