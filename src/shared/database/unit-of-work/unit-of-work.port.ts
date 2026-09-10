import type { EntityMap, TableName } from '../records/records';

export interface Actor {
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
}

export interface Page {
  limit?: number;
  offset?: number;
  order?: string;
  descending?: boolean;
}

export interface Session {
  get<K extends TableName>(table: K, id: string): Promise<EntityMap[K] | null>;
  find<K extends TableName>(
    table: K,
    where?: Partial<EntityMap[K]>,
    page?: Page,
  ): Promise<EntityMap[K][]>;
  insert<K extends TableName>(
    table: K,
    data: Partial<EntityMap[K]>,
  ): Promise<EntityMap[K]>;
  update<K extends TableName>(
    table: K,
    id: string,
    data: Partial<EntityMap[K]>,
  ): Promise<EntityMap[K]>;
  delete<K extends TableName>(table: K, id: string): Promise<void>;
}

export abstract class UnitOfWork {
  abstract read<T>(work: (session: Session) => Promise<T>): Promise<T>;
  abstract write<T>(work: (session: Session) => Promise<T>): Promise<T>;
}

export { ObjectStorage } from '../../integrations/storage/storage.port';
export { PaymentGateway } from '../../integrations/payment/payment.port';

export abstract class RealtimePublisher {
  abstract publish(userIds: string[], topic: string, payload: unknown): void;
}
