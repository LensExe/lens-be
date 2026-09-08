import {
  TransactionType,
  TransactionDirection,
  TransactionStatus,
} from '../enums/transaction.enum';

export interface TransactionProps {
  id: string;
  userId: string;
  transactionCode: string;
  type: TransactionType;
  referenceId?: string;
  direction: TransactionDirection;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentGateway?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TransactionDomainEntity {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _transactionCode: string;
  private readonly _type: TransactionType;
  private readonly _referenceId?: string;
  private readonly _direction: TransactionDirection;
  private readonly _amount: number;
  private readonly _currency: string;
  private _status: TransactionStatus;
  private readonly _paymentGateway?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: TransactionProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._transactionCode = props.transactionCode;
    this._type = props.type;
    this._referenceId = props.referenceId;
    this._direction = props.direction;
    this._amount = props.amount;
    this._currency = props.currency;
    this._status = props.status;
    this._paymentGateway = props.paymentGateway;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get userId(): string {
    return this._userId;
  }
  get transactionCode(): string {
    return this._transactionCode;
  }
  get type(): TransactionType {
    return this._type;
  }
  get referenceId(): string | undefined {
    return this._referenceId;
  }
  get direction(): TransactionDirection {
    return this._direction;
  }
  get amount(): number {
    return this._amount;
  }
  get currency(): string {
    return this._currency;
  }
  get status(): TransactionStatus {
    return this._status;
  }
  get paymentGateway(): string | undefined {
    return this._paymentGateway;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  complete(): void {
    if (this._status !== TransactionStatus.PENDING) {
      throw new Error('Only pending transactions can be completed.');
    }
    this._status = TransactionStatus.COMPLETED;
    this._updatedAt = new Date();
  }

  fail(): void {
    if (this._status !== TransactionStatus.PENDING) {
      throw new Error('Only pending transactions can be marked as failed.');
    }
    this._status = TransactionStatus.FAILED;
    this._updatedAt = new Date();
  }

  cancel(): void {
    if (this._status === TransactionStatus.COMPLETED) {
      throw new Error('Completed transactions cannot be cancelled.');
    }
    this._status = TransactionStatus.CANCELLED;
    this._updatedAt = new Date();
  }
}
