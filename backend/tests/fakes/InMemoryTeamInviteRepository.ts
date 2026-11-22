import { ITeamInviteRepository, TeamInvite } from '@/modules/team/domain/repositories/TeamInviteRepositoryInterface';
import { EmailAlreadyExistsError, User } from '@/modules/users';

import { InMemoryUserRepository } from './InMemoryUserRepository';

export class InMemoryTeamInviteRepository implements ITeamInviteRepository {
  invites: Array<TeamInvite & { userId: string }> = [];

  constructor(private readonly users: InMemoryUserRepository) {}

  async createInvitedUser(user: User, invite: TeamInvite) {
    if (await this.users.findByEmail(user.email!)) throw new EmailAlreadyExistsError();

    await this.users.create(user);
    this.invites.push({ userId: user.id, ...invite });
  }
}
