export interface SubscriptionProps {
  id: string;
  photographerId: string;
  planId: string;
  expiredIn?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SubscriptionDomainEntity {
  private readonly _id: string;
  private readonly _photographerId: string;
  private _planId: string;
  private _expiredIn?: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: SubscriptionProps) {
    this._id = props.id;
    this._photographerId = props.photographerId;
    this._planId = props.planId;
    this._expiredIn = props.expiredIn;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get photographerId(): string {
    return this._photographerId;
  }
  get planId(): string {
    return this._planId;
  }
  get expiredIn(): Date | undefined {
    return this._expiredIn;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  get isExpired(): boolean {
    if (!this._expiredIn) return false;
    return new Date() > this._expiredIn;
  }

  renew(newExpiry: Date): void {
    this._expiredIn = newExpiry;
    this._updatedAt = new Date();
  }

  changePlan(newPlanId: string, newExpiry: Date): void {
    this._planId = newPlanId;
    this._expiredIn = newExpiry;
    this._updatedAt = new Date();
  }
}
