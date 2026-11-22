import { InviteTeamUserUseCase } from '@/modules/team/application/use-cases/InviteTeamUserUseCase';
import { EmailAlreadyExistsError, User } from '@/modules/users';

import { MailMessage } from '@/shared/providers/mail/MailProviderInterface';

import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { InMemoryTeamInviteRepository } from '../fakes/InMemoryTeamInviteRepository';
import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const tokenFrom = (message: MailMessage) => new URL(message.text.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;

function makeSut() {
  const users = new InMemoryUserRepository();
  const invites = new InMemoryTeamInviteRepository(users);
  const mailProvider = { send: vi.fn(async (_message: MailMessage) => {}) };
  const auditLogger = { log: vi.fn(async () => {}) };
  const sut = new InviteTeamUserUseCase(users, invites, mailProvider, auditLogger, 'http://localhost:5173/reset-password');

  return { users, invites, mailProvider, auditLogger, sut };
}

const input = { email: ' Rafael@Barbearia.com ', role: 'barber' as const, actorId: 'admin-1' };

describe('InviteTeamUserUseCase', () => {
  it('cria o usuário sem senha, guarda só o hash, envia o link e audita', async () => {
    const { users, invites, mailProvider, auditLogger, sut } = makeSut();

    const result = await sut.execute(input);

    if (result.isLeft()) throw result.value;
    expect(result.value).toMatchObject({ inviteSent: true, inviteToken: null });
    expect(result.value.user).toMatchObject({
      name: 'rafael',
      email: 'rafael@barbearia.com',
      phone: null,
      role: 'barber',
      active: true,
      guest: false,
    });
    expect(users.items[0].passwordHash).toBeNull();

    const sent = mailProvider.send.mock.calls[0][0];
    expect(sent.to).toBe('rafael@barbearia.com');
    expect(invites.invites[0].tokenHash).toBe(sha256(tokenFrom(sent)));
    expect(invites.invites[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'team.user.invite', actorId: 'admin-1', entityId: result.value.user.id, details: { role: 'barber' } }),
    );
  });

  it('não expõe passwordHash nem tokenVersion', async () => {
    const { sut } = makeSut();

    const result = await sut.execute(input);

    if (result.isLeft()) throw result.value;
    expect(result.value.user).not.toHaveProperty('passwordHash');
    expect(result.value.user).not.toHaveProperty('tokenVersion');
  });

  it('devolve Left(409) quando o e-mail já existe, sem enviar nem auditar', async () => {
    const { users, invites, mailProvider, auditLogger, sut } = makeSut();
    await users.create(User.create({ name: 'Rafael', email: 'rafael@barbearia.com', passwordHash: 'x' }));

    const result = await sut.execute(input);

    expect(result.value).toMatchObject({ statusCode: 409, code: 'EMAIL_ALREADY_EXISTS' });
    expect(invites.invites).toHaveLength(0);
    expect(mailProvider.send).not.toHaveBeenCalled();
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('devolve Left(409) quando uma requisição concorrente cria o e-mail antes do insert', async () => {
    const { invites, mailProvider, sut } = makeSut();
    vi.spyOn(invites, 'createInvitedUser').mockRejectedValueOnce(new EmailAlreadyExistsError());

    const result = await sut.execute(input);

    expect(result.value).toMatchObject({ statusCode: 409 });
    expect(mailProvider.send).not.toHaveBeenCalled();
  });

  it('quando o e-mail falha, mantém o convite e devolve o token', async () => {
    const { invites, mailProvider, sut } = makeSut();
    mailProvider.send.mockRejectedValueOnce(new Error('resend fora do ar'));

    const result = await sut.execute(input);

    if (result.isLeft()) throw result.value;
    expect(result.value.inviteSent).toBe(false);
    expect(invites.invites[0].tokenHash).toBe(sha256(result.value.inviteToken!));
  });

  it('propaga falhas inesperadas do repositório', async () => {
    const { invites, sut } = makeSut();
    vi.spyOn(invites, 'createInvitedUser').mockRejectedValueOnce(new Error('banco fora do ar'));

    await expect(sut.execute(input)).rejects.toThrow('banco fora do ar');
  });
});
