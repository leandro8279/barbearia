import type { User } from '@/modules/users';

export interface ITeamRepository {
  countOtherActiveAdmins(excludeUserId: string): Promise<number>;
  saveAccess(member: User, options: { guardLastAdmin: boolean }): Promise<boolean>;
}
