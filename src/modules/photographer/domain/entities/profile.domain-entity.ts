export interface ProfileProps {
  id: string;
  photographerId: string;
  images?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ProfileDomainEntity {
  private readonly _id: string;
  private readonly _photographerId: string;
  private _images?: string;
  private _description?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ProfileProps) {
    this._id = props.id;
    this._photographerId = props.photographerId;
    this._images = props.images;
    this._description = props.description;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get photographerId(): string {
    return this._photographerId;
  }
  get images(): string | undefined {
    return this._images;
  }
  get description(): string | undefined {
    return this._description;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateProfile(data: { images?: string; description?: string }): void {
    if (data.images !== undefined) this._images = data.images;
    if (data.description !== undefined) this._description = data.description;
    this._updatedAt = new Date();
  }
}
