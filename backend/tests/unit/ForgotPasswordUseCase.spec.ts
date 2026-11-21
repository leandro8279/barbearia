import { ForgotPasswordUseCase } from '@/modules/auth/application/use-cases/ForgotPasswordUseCase';
import { NewPasswordReset } from '@/modules/auth/domain/repositories/PasswordResetRepositoryInterface';
import { User } from '@/modules/users';

import { MailMessage } from '@/shared/providers/mail/MailProviderInterface';

import { describe, expect, it } from 'vitest';

import { InMemoryPasswordResetRepository } from '../fakes/InMemoryPasswordResetRepository';
import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

function makeSut() {
  const users = new InMemoryUserRepository();
  const resets = new InMemoryPasswordResetRepository();
  const sent: MailMessage[] = [];
  const audit: unknown[] = [];

  const sut = new ForgotPasswordUseCase(
    users,
    resets,
    { send: async (m) => void sent.push(m) },
    { log: async (e) => void audit.push(e) },
    'http://localhost:5173/reset-password',
  );

  return { users, resets, sent, audit, sut };
}

describe('ForgotPasswordUseCase', () => {
  it('responde igual e não envia nada quando o e-mail não existe', async () => {
    const { resets, sent, audit, sut } = makeSut();

    const output = await sut.execute({ email: 'ninguem@email.com' });

    expect(output.message).toMatch(/Se o e-mail/);
    expect(resets).toHaveLength(0);
    expect(sent).toHaveLength(0);
    expect(audit).toHaveLength(1);
  });

  it('ignora usuário inativo', async () => {
    const { users, sent, sut } = makeSut();
    await users.create(User.create({ name: 'Ana', email: 'ana@email.com', passwordHash: 'x', active: false }));

    await sut.execute({ email: 'ana@email.com' });

    expect(sent).toHaveLength(0);
  });
});
