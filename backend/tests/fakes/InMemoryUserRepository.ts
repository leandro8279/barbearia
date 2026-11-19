import { IUserRepository, User } from '@/modules/users';

import { PaginationParams } from '@/shared/types/pagination.types';
import { buildPaginatedResult } from '@/shared/utils/pagination';

export class InMemoryUserRepository implements IUserRepository {
  items: User[] = [];

  async findById(id: string) {
    return this.items.find((u) => u.id === id) ?? null;
  }
  async findByEmail(email: string) {
    return this.items.find((u) => u.email === email) ?? null;
  }
  async findGuestByPhone(phone: string) {
    return this.items.find((u) => u.phone === phone && u.guest) ?? null;
  }
  async findRegisteredByPhone(phone: string) {
    return this.items.find((u) => u.phone === phone && !u.guest) ?? null;
  }
  async findAll(params: PaginationParams) {
    return buildPaginatedResult(this.items, this.items.length, params);
  }
  async create(user: User) {
    this.items.push(user);
    return user;
  }
  async update(user: User) {
    return user;
  }
}
