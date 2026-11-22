import { InviteTeamUserDTO, InviteTeamUserResponseDTO, toInviteTeamUserResponse } from '@/modules/team/application/dtos/InviteTeamUserDTO';
import { buildTeamInvitationEmail } from '@/modules/team/application/mail/teamInvitationEmail';
import { ITeamInviteRepository } from '@/modules/team/domain/repositories/TeamInviteRepositoryInterface';
import { EmailAlreadyExistsError, IUserRepository, User } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';
import { IMailProvider } from '@/shared/providers/mail/MailProviderInterface';

import { createHash, randomBytes } from 'node:crypto';

export const TEAM_INVITE_TTL_MS = 48 * 60 * 60 * 1000;

export type InviteTeamUserOutput = Either<EmailAlreadyExistsError, InviteTeamUserResponseDTO>;

export class InviteTeamUserUseCase implements IUseCase<InviteTeamUserDTO, InviteTeamUserOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly inviteRepository: ITeamInviteRepository,
    private readonly mailProvider: IMailProvider,
    private readonly auditLogger: IAuditLogger,
    private readonly inviteUrlBase: string,
  ) {}

  async execute({ email: rawEmail, role, actorId }: InviteTeamUserDTO): Promise<InviteTeamUserOutput> {
    const email = rawEmail.trim().toLowerCase();

    if (await this.userRepository.findByEmail(email)) return left(new EmailAlreadyExistsError());

    const user = User.create({ name: email.split('@')[0], email, role });
    const token = randomBytes(32).toString('hex');
    const invite = {
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + TEAM_INVITE_TTL_MS),
    };

    try {
      await this.inviteRepository.createInvitedUser(user, invite);
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) return left(error);
      throw error;
    }

    await this.auditLogger.log({ actorId, action: 'team.user.invite', entity: 'users', entityId: user.id, details: { role } });

    const sent = await this.sendInvitation(email, token);

    return right(toInviteTeamUserResponse(user, sent ? null : token));
  }

  private async sendInvitation(email: string, token: string): Promise<boolean> {
    try {
      const link = `${this.inviteUrlBase}?token=${token}`;
      await this.mailProvider.send({ to: email, ...buildTeamInvitationEmail(link, TEAM_INVITE_TTL_MS / 3_600_000) });
      return true;
    } catch {
      return false;
    }
  }
}
