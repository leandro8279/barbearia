import { User } from '@/modules/users/domain/entities/User';

import { IRepository } from '@/shared/interfaces/RepositoryInterface';
import { PaginatedResult, PaginationParams } from '@/shared/types/pagination.types';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findGuestByPhone(phone: string): Promise<User | null>;
  findRegisteredByPhone(phone: string): Promise<User | null>;
  findAll(params: PaginationParams): Promise<PaginatedResult<User>>;
  update(user: User): Promise<User>;
  promoteGuest(user: User): Promise<User | null>;
  touchLastAccess(id: string, at: Date): Promise<void>;
  findStaff(): Promise<User[]>;
}
