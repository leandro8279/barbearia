import { Auth } from '@/modules/auth/domain/entities/Auth';
import { IAuthRepository } from '@/modules/auth/domain/repositories/AuthRepositoryInterface';
import { PaginationParams } from '@/shared/types/pagination.types';
import { buildPaginatedResult } from '@/shared/utils/pagination';

export class InMemoryAuthRepository implements IAuthRepository {
  items: Auth[] = [];

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async findAll(params: PaginationParams) {
    return buildPaginatedResult(this.items, this.items.length, params);
  }

  async create(entity: Auth) {
    this.items.push(entity);
    return entity;
  }
}
