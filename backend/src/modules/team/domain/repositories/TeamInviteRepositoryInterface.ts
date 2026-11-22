import type { User } from '@/modules/users';

export interface TeamInvite {
  tokenHash: string;
  expiresAt: Date;
}

export interface ITeamInviteRepository {
  createInvitedUser(user: User, invite: TeamInvite): Promise<void>;
}
