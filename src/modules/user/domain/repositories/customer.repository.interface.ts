import { CustomerDomainEntity } from '../entities/customer.domain-entity';

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');

export interface ICustomerRepository {
  findById(id: string): Promise<CustomerDomainEntity | null>;
  findByUserId(userId: string): Promise<CustomerDomainEntity | null>;
  findAll(): Promise<CustomerDomainEntity[]>;
  save(customer: CustomerDomainEntity): Promise<CustomerDomainEntity>;
  delete(id: string): Promise<void>;
}
