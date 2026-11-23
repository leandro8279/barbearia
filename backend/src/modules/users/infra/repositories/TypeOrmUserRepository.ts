import { CpfAlreadyExistsError } from '@/modules/users/application/errors/CpfAlreadyExistsError';
import { EmailAlreadyExistsError } from '@/modules/users/application/errors/EmailAlreadyExistsError';
import { PhoneAlreadyExistsError } from '@/modules/users/application/errors/PhoneAlreadyExistsError';
import { STAFF_ROLES, User } from '@/modules/users/domain/entities/User';
import { IUserRepository } from '@/modules/users/domain/repositories/UserRepositoryInterface';
import { UserEntity } from '@/modules/users/infra/entities/UserEntity';
import { UserMapper } from '@/modules/users/infra/mappers/UserMapper';

import { PaginatedResult, PaginationParams } from '@/shared/types/pagination.types';
import { buildPaginatedResult, getSkip } from '@/shared/utils/pagination';

import { DataSource, In, QueryDeepPartialEntity, QueryFailedError, Repository } from 'typeorm';

export class TypeOrmUserRepository implements IUserRepository {
  private readonly repository: Repository<UserEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(UserEntity);
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOneBy({ id });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOneBy({ email });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findAll(params: PaginationParams): Promise<PaginatedResult<User>> {
    const [entities, total] = await this.repository.findAndCount({ skip: getSkip(params), take: params.limit, order: { createdAt: 'DESC' } });

    return buildPaginatedResult(entities.map(UserMapper.toDomain), total, params);
  }

  async create(user: User): Promise<User> {
    try {
      const saved = await this.repository.save(this.repository.create(UserMapper.toPersistence(user)));

      return UserMapper.toDomain(saved);
    } catch (error) {
      throw this.translateConstraintError(error);
    }
  }

  async findGuestByPhone(phone: string): Promise<User | null> {
    const entity = await this.repository.findOneBy({ phone, guest: true });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findRegisteredByPhone(phone: string): Promise<User | null> {
    const entity = await this.repository.findOneBy({ phone, guest: false });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async update(user: User): Promise<User> {
    try {
      const saved = await this.repository.save(this.repository.create(UserMapper.toPersistence(user)));

      return UserMapper.toDomain(saved);
    } catch (error) {
      throw this.translateConstraintError(error);
    }
  }

  async promoteGuest(user: User): Promise<User | null> {
    const { id, createdAt: _createdAt, ...data } = UserMapper.toPersistence(user);

    try {
      const result = await this.repository.update({ id: user.id, guest: true }, data as QueryDeepPartialEntity<UserEntity>);
      if (!result.affected) return null;
    } catch (error) {
      throw this.translateConstraintError(error);
    }

    return this.findById(id as string);
  }

  private translateConstraintError(error: unknown): unknown {
    if (!(error instanceof QueryFailedError)) return error;

    const { code, message } = error.driverError as { code?: string; message?: string };
    if (code !== 'SQLITE_CONSTRAINT_UNIQUE') return error;

    if (message?.includes('users.email')) return new EmailAlreadyExistsError();
    if (message?.includes('users.cpf')) return new CpfAlreadyExistsError();
    if (message?.includes('users.phone')) return new PhoneAlreadyExistsError();

    return error;
  }

  async touchLastAccess(id: string, at: Date): Promise<void> {
    await this.repository.update({ id }, { lastAccessAt: at, updatedAt: at });
  }

  async findStaff(): Promise<User[]> {
    const entities = await this.repository.find({ where: { role: In([...STAFF_ROLES]) }, order: { name: 'ASC' } });

    return entities.map(UserMapper.toDomain);
  }
}
