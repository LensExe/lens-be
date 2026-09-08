export interface PhotographerPlanProps {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  isActive: boolean;
  billingCycle: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PhotographerPlanDomainEntity {
  private readonly _id: string;
  private _code: string;
  private _name: string;
  private _description?: string;
  private _price: number;
  private _isActive: boolean;
  private _billingCycle: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PhotographerPlanProps) {
    this._id = props.id;
    this._code = props.code;
    this._name = props.name;
    this._description = props.description;
    this._price = props.price;
    this._isActive = props.isActive;
    this._billingCycle = props.billingCycle;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get code(): string {
    return this._code;
  }
  get name(): string {
    return this._name;
  }
  get description(): string | undefined {
    return this._description;
  }
  get price(): number {
    return this._price;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get billingCycle(): string {
    return this._billingCycle;
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
