import { ITeamRepository } from '@/modules/team/domain/repositories/TeamRepositoryInterface';
import { User } from '@/modules/users';

import { InMemoryUserRepository } from './InMemoryUserRepository';

export class InMemoryTeamRepository implements ITeamRepository {
  /** Simula a corrida: o repositório real desfaz a gravação quando sobraria zero admins ativos. */
  rejectNextSave = false;
  saved: User[] = [];

  constructor(private readonly users: InMemoryUserRepository) {}

  async countOtherActiveAdmins(excludeUserId: string) {
    return this.users.items.filter((u) => u.role === 'admin' && u.active && u.id !== excludeUserId).length;
  }

  async saveAccess(member: User) {
    if (this.rejectNextSave) {
      this.rejectNextSave = false;
      return false;
    }

    this.saved.push(member);
    return true;
  }
}
