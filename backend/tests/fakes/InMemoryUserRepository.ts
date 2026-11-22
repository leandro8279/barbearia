import { IUserRepository, STAFF_ROLES, User } from '@/modules/users';

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
    const index = this.items.findIndex((u) => u.id === user.id);
    if (index !== -1) this.items[index] = user;
    return user;
  }

  async promoteGuest(user: User) {
    return this.update(user);
  }

  async touchLastAccess(id: string, at: Date) {
    const user = this.items.find((u) => u.id === id);
    user?.recordAccess(at);
  }

  async findStaff() {
    return this.items.filter((u) => (STAFF_ROLES as readonly string[]).includes(u.role));
  }
}
