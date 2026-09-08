export interface WorkingSlotProps {
  id: string;
  photographerId: string;
  day: string;
  date?: Date;
  from: string;
  to: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WorkingSlotDomainEntity {
  private readonly _id: string;
  private readonly _photographerId: string;
  private _day: string;
  private _date?: Date;
  private _from: string;
  private _to: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: WorkingSlotProps) {
    this._id = props.id;
    this._photographerId = props.photographerId;
    this._day = props.day;
    this._date = props.date;
    this._from = props.from;
    this._to = props.to;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get photographerId(): string {
    return this._photographerId;
  }
  get day(): string {
    return this._day;
  }
  get date(): Date | undefined {
    return this._date;
  }
  get from(): string {
    return this._from;
  }
  get to(): string {
    return this._to;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateSlot(data: {
    day?: string;
    date?: Date;
    from?: string;
    to?: string;
  }): void {
    if (data.day !== undefined) this._day = data.day;
    if (data.date !== undefined) this._date = data.date;
    if (data.from !== undefined) this._from = data.from;
    if (data.to !== undefined) this._to = data.to;
    this._updatedAt = new Date();
  }
}
