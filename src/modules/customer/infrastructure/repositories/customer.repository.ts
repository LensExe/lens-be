import { Injectable } from '@nestjs/common';
import type { ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { CustomerDomainEntity } from '../../domain/entities/customer.domain-entity';
import { CustomerOrmEntity } from '../entities/customer.orm-entity';
import { CustomerMapper } from '../mappers/customer.mapper';

@Injectable()
export class CustomerRepository implements ICustomerRepository {
  private readonly databaseTable: Map<string, CustomerOrmEntity> = new Map();

  findById(id: string): Promise<CustomerDomainEntity | null> {
    const orm = this.databaseTable.get(id);
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(CustomerMapper.toDomain(orm));
  }

  findByUserId(userId: string): Promise<CustomerDomainEntity | null> {
    const orm = Array.from(this.databaseTable.values()).find(
      (c) => c.userId === userId,
    );
    if (!orm) return Promise.resolve(null);
    return Promise.resolve(CustomerMapper.toDomain(orm));
  }

  findAll(): Promise<CustomerDomainEntity[]> {
    const orms = Array.from(this.databaseTable.values());
    return Promise.resolve(orms.map((orm) => CustomerMapper.toDomain(orm)));
  }

  save(customer: CustomerDomainEntity): Promise<CustomerDomainEntity> {
    const orm = CustomerMapper.toOrm(customer);
    this.databaseTable.set(orm.id, orm);
    return Promise.resolve(CustomerMapper.toDomain(orm));
  }

  delete(id: string): Promise<void> {
    this.databaseTable.delete(id);
    return Promise.resolve();
  }
}
