import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => UserResponseDto.fromDomain(user));
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    return UserResponseDto.fromDomain(user);
  }

  async findByKeycloakId(keycloakId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findByKeycloakId(keycloakId);
    if (!user) {
      throw new NotFoundException(
        `User with Keycloak ID "${keycloakId}" not found.`,
      );
    }
    return UserResponseDto.fromDomain(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    user.updateProfile(dto);
    const saved = await this.userRepository.save(user);
    return UserResponseDto.fromDomain(saved);
  }

  async ban(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    user.ban();
    const saved = await this.userRepository.save(user);
    return UserResponseDto.fromDomain(saved);
  }
}
