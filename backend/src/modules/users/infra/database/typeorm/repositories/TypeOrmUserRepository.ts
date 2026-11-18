import { User } from '@/modules/users/domain/entities/User';
import { IUserRepository } from '@/modules/users/domain/repositories/UserRepositoryInterface';
import { UserEntity } from '@/modules/users/infra/database/typeorm/entities/UserEntity';
import { UserMapper } from '@/modules/users/infra/database/typeorm/mappers/UserMapper';

import { PaginatedResult, PaginationParams } from '@/shared/types/pagination.types';
import { buildPaginatedResult, getSkip } from '@/shared/utils/pagination';

import { DataSource, Repository } from 'typeorm';

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
    const [entities, total] = await this.repository.findAndCount({
      skip: getSkip(params),
      take: params.limit,
      order: {
        createdAt: 'DESC',
      },
    });

    return buildPaginatedResult(entities.map(UserMapper.toDomain), total, params);
  }

  async create(user: User): Promise<User> {
    const entity = this.repository.create(UserMapper.toPersistence(user));

    const saved = await this.repository.save(entity);

    return UserMapper.toDomain(saved);
  }
}
