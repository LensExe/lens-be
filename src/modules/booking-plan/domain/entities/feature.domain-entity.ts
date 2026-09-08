export interface FeatureProps {
  id: string;
  planId: string;
  code: string;
  name: string;
  value?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class FeatureDomainEntity {
  private readonly _id: string;
  private readonly _planId: string;
  private _code: string;
  private _name: string;
  private _value?: string;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: FeatureProps) {
    this._id = props.id;
    this._planId = props.planId;
    this._code = props.code;
    this._name = props.name;
    this._value = props.value;
    this._isActive = props.isActive;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get planId(): string {
    return this._planId;
  }
  get code(): string {
    return this._code;
  }
  get name(): string {
    return this._name;
  }
  get value(): string | undefined {
    return this._value;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }
}
