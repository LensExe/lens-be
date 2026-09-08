export interface FeedbackProps {
  id: string;
  bookingId: string;
  customerId: string;
  rating: number;
  punctualityRating?: number;
  attitudeRating?: number;
  comment?: string;
  isEdited: boolean;
  isVisible: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class FeedbackDomainEntity {
  private readonly _id: string;
  private readonly _bookingId: string;
  private readonly _customerId: string;
  private _rating: number;
  private _punctualityRating?: number;
  private _attitudeRating?: number;
  private _comment?: string;
  private _isEdited: boolean;
  private _isVisible: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: FeedbackProps) {
    this._id = props.id;
    this._bookingId = props.bookingId;
    this._customerId = props.customerId;
    this._rating = props.rating;
    this._punctualityRating = props.punctualityRating;
    this._attitudeRating = props.attitudeRating;
    this._comment = props.comment;
    this._isEdited = props.isEdited;
    this._isVisible = props.isVisible;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get bookingId(): string {
    return this._bookingId;
  }
  get customerId(): string {
    return this._customerId;
  }
  get rating(): number {
    return this._rating;
  }
  get punctualityRating(): number | undefined {
    return this._punctualityRating;
  }
  get attitudeRating(): number | undefined {
    return this._attitudeRating;
  }
  get comment(): string | undefined {
    return this._comment;
  }
  get isEdited(): boolean {
    return this._isEdited;
  }
  get isVisible(): boolean {
    return this._isVisible;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  edit(data: {
    rating?: number;
    punctualityRating?: number;
    attitudeRating?: number;
    comment?: string;
  }): void {
    if (data.rating !== undefined) this._rating = data.rating;
    if (data.punctualityRating !== undefined)
      this._punctualityRating = data.punctualityRating;
    if (data.attitudeRating !== undefined)
      this._attitudeRating = data.attitudeRating;
    if (data.comment !== undefined) this._comment = data.comment;
    this._isEdited = true;
    this._updatedAt = new Date();
  }

  hide(): void {
    this._isVisible = false;
    this._updatedAt = new Date();
  }

  show(): void {
    this._isVisible = true;
    this._updatedAt = new Date();
  }
}
