export interface OfflineSlotProps {
  id: string;
  photographerId: string;
  from: string;
  to: string;
  day: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class OfflineSlotDomainEntity {
  private readonly _id: string;
  private readonly _photographerId: string;
  private _from: string;
  private _to: string;
  private _day: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: OfflineSlotProps) {
    this._id = props.id;
    this._photographerId = props.photographerId;
    this._from = props.from;
    this._to = props.to;
    this._day = props.day;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get photographerId(): string {
    return this._photographerId;
  }
  get from(): string {
    return this._from;
  }
  get to(): string {
    return this._to;
  }
  get day(): string {
    return this._day;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateSlot(data: { from?: string; to?: string; day?: string }): void {
    if (data.from !== undefined) this._from = data.from;
    if (data.to !== undefined) this._to = data.to;
    if (data.day !== undefined) this._day = data.day;
    this._updatedAt = new Date();
  }
}
