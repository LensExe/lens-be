import {
  TransactionType,
  TransactionDirection,
  TransactionStatus,
} from '../../domain/enums/transaction.enum';

export class WalletOrmEntity {
  id: string;
  userId: string;
  balance: number;
  frozenBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TransactionOrmEntity {
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
  createdAt: Date;
  updatedAt: Date;
}
