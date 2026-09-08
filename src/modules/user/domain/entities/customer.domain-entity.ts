export interface CustomerProps {
  id: string;
  userId: string;
  location?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CustomerDomainEntity {
  private readonly _id: string;
  private readonly _userId: string;
  private _location?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: CustomerProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._location = props.location;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get location(): string | undefined {
    return this._location;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateLocation(location: string): void {
    this._location = location;
    this._updatedAt = new Date();
  }
}
