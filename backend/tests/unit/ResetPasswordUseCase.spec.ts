import { ResetPasswordUseCase } from '@/modules/auth/application/use-cases/ResetPasswordUseCase';
import { User } from '@/modules/users';

import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { InMemoryPasswordResetRepository } from '../fakes/InMemoryPasswordResetRepository';
import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

async function makeSut() {
  const users = new InMemoryUserRepository();
  const resets = new InMemoryPasswordResetRepository();
  const hashProvider = { hash: vi.fn(async (p: string) => `hashed:${p}`), compare: vi.fn() };
  const auditLogger = { log: vi.fn(async () => {}) };
  const sut = new ResetPasswordUseCase(users, resets, hashProvider, auditLogger);

  const user = await users.create(User.create({ name: 'João', email: 'joao@email.com', passwordHash: 'old' }));
  return { users, resets, sut, user, auditLogger };
}

describe('ResetPasswordUseCase', () => {
  it('troca a senha, incrementa tokenVersion e consome o token', async () => {
    const { sut, resets, user, auditLogger } = await makeSut();
    await resets.create({ tokenHash: sha256('tok'), userId: user.id, expiresAt: new Date(Date.now() + 60_000) });

    const result = await sut.execute({ token: 'tok', password: 'nova-senha-123' });

    expect(result.isRight()).toBe(true);
    expect(user.passwordHash).toBe('hashed:nova-senha-123');
    expect(user.tokenVersion).toBe(1);
    expect(resets.items).toHaveLength(0);
    expect(auditLogger.log).toHaveBeenCalledOnce();
  });

  it('rejeita token inexistente', async () => {
    const { sut } = await makeSut();
    const result = await sut.execute({ token: 'x', password: 'nova-senha-123' });
    expect(result.value).toMatchObject({ statusCode: 400, code: 'INVALID_RESET_TOKEN' });
  });

  it('rejeita token expirado', async () => {
    const { sut, resets, user } = await makeSut();
    await resets.create({ tokenHash: sha256('tok'), userId: user.id, expiresAt: new Date(Date.now() - 1) });
    expect((await sut.execute({ token: 'tok', password: 'nova-senha-123' })).isLeft()).toBe(true);
  });

  it('é de uso único', async () => {
    const { sut, resets, user } = await makeSut();
    await resets.create({ tokenHash: sha256('tok'), userId: user.id, expiresAt: new Date(Date.now() + 60_000) });

    await sut.execute({ token: 'tok', password: 'nova-senha-123' });
    expect((await sut.execute({ token: 'tok', password: 'outra-senha-123' })).isLeft()).toBe(true);
  });
});
