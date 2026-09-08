export interface ReplyProps {
  id: string;
  feedbackId: string;
  comment: string;
  isVisible: boolean;
  isEdited: boolean;
  repliedBy: string;
  createdAt?: Date;
}

export class ReplyDomainEntity {
  private readonly _id: string;
  private readonly _feedbackId: string;
  private _comment: string;
  private _isVisible: boolean;
  private _isEdited: boolean;
  private readonly _repliedBy: string;
  private readonly _createdAt: Date;

  constructor(props: ReplyProps) {
    this._id = props.id;
    this._feedbackId = props.feedbackId;
    this._comment = props.comment;
    this._isVisible = props.isVisible;
    this._isEdited = props.isEdited;
    this._repliedBy = props.repliedBy;
    this._createdAt = props.createdAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get feedbackId(): string {
    return this._feedbackId;
  }
  get comment(): string {
    return this._comment;
  }
  get isVisible(): boolean {
    return this._isVisible;
  }
  get isEdited(): boolean {
    return this._isEdited;
  }
  get repliedBy(): string {
    return this._repliedBy;
  }
  get createdAt(): Date {
    return this._createdAt;
  }

  edit(newComment: string): void {
    this._comment = newComment;
    this._isEdited = true;
  }

  hide(): void {
    this._isVisible = false;
  }

  show(): void {
    this._isVisible = true;
  }
}
