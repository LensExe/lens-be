import { BookingStatus } from '../enums/booking-status.enum';

export interface BookingProps {
  id: string;
  userId: string;
  lensId: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BookingDomainEntity {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _lensId: string;
  private _startTime: Date;
  private _endTime: Date;
  private _status: BookingStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: BookingProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._lensId = props.lensId;
    this._startTime = props.startTime;
    this._endTime = props.endTime;
    this._status = props.status;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get lensId(): string {
    return this._lensId;
  }

  get startTime(): Date {
    return this._startTime;
  }

  get endTime(): Date {
    return this._endTime;
  }

  get status(): BookingStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  confirm(): void {
    if (this._status !== BookingStatus.PENDING) {
      throw new Error('Only pending bookings can be confirmed.');
    }
    this._status = BookingStatus.CONFIRMED;
    this._updatedAt = new Date();
  }

  cancel(): void {
    if (this._status === BookingStatus.COMPLETED) {
      throw new Error('Completed bookings cannot be cancelled.');
    }
    this._status = BookingStatus.CANCELLED;
    this._updatedAt = new Date();
  }
}
