export interface RatingProps {
  id: string;
  photographerId: string;
  averageRating: number;
  totalFeedbacks: number;
  totalBookings: number;
  returnCustomers: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class RatingDomainEntity {
  private readonly _id: string;
  private readonly _photographerId: string;
  private _averageRating: number;
  private _totalFeedbacks: number;
  private _totalBookings: number;
  private _returnCustomers: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: RatingProps) {
    this._id = props.id;
    this._photographerId = props.photographerId;
    this._averageRating = props.averageRating;
    this._totalFeedbacks = props.totalFeedbacks;
    this._totalBookings = props.totalBookings;
    this._returnCustomers = props.returnCustomers;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get photographerId(): string {
    return this._photographerId;
  }
  get averageRating(): number {
    return this._averageRating;
  }
  get totalFeedbacks(): number {
    return this._totalFeedbacks;
  }
  get totalBookings(): number {
    return this._totalBookings;
  }
  get returnCustomers(): number {
    return this._returnCustomers;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  recalculate(newRating: number): void {
    const totalScore = this._averageRating * this._totalFeedbacks + newRating;
    this._totalFeedbacks += 1;
    this._averageRating = totalScore / this._totalFeedbacks;
    this._updatedAt = new Date();
  }

  incrementBookings(): void {
    this._totalBookings += 1;
    this._updatedAt = new Date();
  }

  incrementReturnCustomers(): void {
    this._returnCustomers += 1;
    this._updatedAt = new Date();
  }
}
