import type { User } from '@/modules/users';

export interface TeamInvite {
  tokenHash: string;
  expiresAt: Date;
}

export interface ITeamInviteRepository {
  countOtherActiveAdmins(excludeUserId: string): Promise<number>;
  createInvitedUser(user: User, invite: TeamInvite): Promise<void>;
  saveAccess(member: User, options: { guardLastAdmin: boolean }): Promise<boolean>;
}
