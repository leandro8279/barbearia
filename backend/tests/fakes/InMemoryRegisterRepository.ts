import { Register } from '@/modules/auth/domain/entities/Register';
import { IRegisterRepository } from '@/modules/auth/domain/repositories/RegisterRepositoryInterface';
import { PaginationParams } from '@/shared/types/pagination.types';
import { buildPaginatedResult } from '@/shared/utils/pagination';

export class InMemoryRegisterRepository implements IRegisterRepository {
  items: Register[] = [];

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async findAll(params: PaginationParams) {
    return buildPaginatedResult(this.items, this.items.length, params);
  }

  async create(entity: Register) {
    this.items.push(entity);
    return entity;
  }
}
