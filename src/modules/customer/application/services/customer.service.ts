import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CUSTOMER_REPOSITORY } from '../../domain/repositories/customer.repository.interface';
import type { ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { CustomerResponseDto } from '../dto/customer-response.dto';

@Injectable()
export class CustomerService {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async findAll(): Promise<CustomerResponseDto[]> {
    const customers = await this.customerRepository.findAll();
    return customers.map((customer) =>
      CustomerResponseDto.fromDomain(customer),
    );
  }

  async findById(id: string): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found.`);
    }
    return CustomerResponseDto.fromDomain(customer);
  }

  async findByUserId(userId: string): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findByUserId(userId);
    if (!customer) {
      throw new NotFoundException(
        `Customer with User ID "${userId}" not found.`,
      );
    }
    return CustomerResponseDto.fromDomain(customer);
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found.`);
    }
    if (dto.location !== undefined) {
      customer.updateLocation(dto.location);
    }
    const saved = await this.customerRepository.save(customer);
    return CustomerResponseDto.fromDomain(saved);
  }
}
