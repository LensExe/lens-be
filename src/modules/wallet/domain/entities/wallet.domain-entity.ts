export interface WalletProps {
  id: string;
  userId: string;
  balance: number;
  frozenBalance: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WalletDomainEntity {
  private readonly _id: string;
  private readonly _userId: string;
  private _balance: number;
  private _frozenBalance: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: WalletProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._balance = props.balance;
    this._frozenBalance = props.frozenBalance;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }
  get userId(): string {
    return this._userId;
  }
  get balance(): number {
    return this._balance;
  }
  get frozenBalance(): number {
    return this._frozenBalance;
  }
  get availableBalance(): number {
    return this._balance - this._frozenBalance;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  deposit(amount: number): void {
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive.');
    }
    this._balance += amount;
    this._updatedAt = new Date();
  }

  withdraw(amount: number): void {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive.');
    }
    if (amount > this.availableBalance) {
      throw new Error('Insufficient available balance.');
    }
    this._balance -= amount;
    this._updatedAt = new Date();
  }

  freeze(amount: number): void {
    if (amount <= 0) {
      throw new Error('Freeze amount must be positive.');
    }
    if (amount > this.availableBalance) {
      throw new Error('Insufficient available balance to freeze.');
    }
    this._frozenBalance += amount;
    this._updatedAt = new Date();
  }

  unfreeze(amount: number): void {
    if (amount <= 0) {
      throw new Error('Unfreeze amount must be positive.');
    }
    if (amount > this._frozenBalance) {
      throw new Error('Unfreeze amount exceeds frozen balance.');
    }
    this._frozenBalance -= amount;
    this._updatedAt = new Date();
  }
}
