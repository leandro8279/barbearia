// tests/unit/ChangePasswordUseCase.spec.ts
import { ChangePasswordUseCase } from '@/modules/auth/application/use-cases/ChangePasswordUseCase';
import { User } from '@/modules/users';

import { describe, expect, it, vi } from 'vitest';

import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

async function makeSut() {
  const users = new InMemoryUserRepository();
  const hashProvider = {
    hash: vi.fn(async (p: string) => `hashed:${p}`),
    compare: vi.fn(async (p: string, h: string) => h === `hashed:${p}`),
  };
  const auditLogger = { log: vi.fn(async () => {}) };
  const sut = new ChangePasswordUseCase(users, hashProvider, auditLogger);
  const user = await users.create(User.create({ name: 'João', email: 'joao@email.com', passwordHash: 'hashed:antiga-123' }));
  return { sut, user, auditLogger };
}

describe('ChangePasswordUseCase', () => {
  it('troca a senha, incrementa tokenVersion e audita', async () => {
    const { sut, user, auditLogger } = await makeSut();

    const result = await sut.execute({ userId: user.id, currentPassword: 'antiga-123', password: 'nova-senha-123' });

    expect(result.isRight()).toBe(true);
    expect(user.passwordHash).toBe('hashed:nova-senha-123');
    expect(user.tokenVersion).toBe(1);
    expect(auditLogger.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.password.change', actorId: user.id }));
  });

  it('rejeita senha atual incorreta sem alterar nada', async () => {
    const { sut, user } = await makeSut();

    const result = await sut.execute({ userId: user.id, currentPassword: 'errada', password: 'nova-senha-123' });

    expect(result.value).toMatchObject({ statusCode: 400, code: 'INVALID_CURRENT_PASSWORD' });
    expect(user.tokenVersion).toBe(0);
  });

  it('devolve Left(401) quando o usuário não existe', async () => {
    const { sut } = await makeSut();
    const result = await sut.execute({ userId: 'x', currentPassword: 'a', password: 'nova-senha-123' });
    expect(result.value).toMatchObject({ statusCode: 401 });
  });

  it('rejeita convidado (sem senha)', async () => {
    const { sut } = await makeSut();
    const result = await sut.execute({ userId: 'x', currentPassword: 'a', password: 'nova-senha-123' });
    expect(result.isLeft()).toBe(true);
  });
});
