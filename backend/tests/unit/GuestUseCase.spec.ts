import { GuestUseCase } from '@/modules/auth/application/use-cases/GuestUseCase';
import { User } from '@/modules/users';

// tests/unit/GuestUseCase.spec.ts
import { describe, expect, it, vi } from 'vitest';

import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

function makeSut() {
  const repo = new InMemoryUserRepository();
  const tokenProvider = { sign: vi.fn(() => 'token'), verify: vi.fn() };
  const auditLogger = { log: vi.fn() };
  const sut = new GuestUseCase(repo, tokenProvider, auditLogger);
  return { repo, auditLogger, sut };
}

const input = { name: 'João', phone: '(62) 99999-8888', reminders: true };

describe('GuestUseCase', () => {
  it('cria guest e audita (created = true)', async () => {
    const { repo, auditLogger, sut } = makeSut();

    const result = await sut.execute(input);

    if (result.isLeft()) throw result.value;
    expect(result.value.created).toBe(true);
    expect(repo.items[0]).toMatchObject({ phone: '62999998888', guest: true, email: null });
    expect(auditLogger.log).toHaveBeenCalledOnce();
  });

  it('reaproveita guest existente (created = false) sem auditar', async () => {
    const { repo, auditLogger, sut } = makeSut();
    await repo.create(User.create({ name: 'João', phone: '62999998888', guest: true }));

    const result = await sut.execute(input);

    if (result.isLeft()) throw result.value;
    expect(result.value.created).toBe(false);
    expect(repo.items).toHaveLength(1);
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('devolve Left(409) quando o telefone pertence a uma conta', async () => {
    const { repo, sut } = makeSut();
    await repo.create(User.create({ name: 'João', email: 'a@a.com', passwordHash: 'x', phone: '62999998888' }));

    const result = await sut.execute(input);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ statusCode: 409, code: 'PHONE_BELONGS_TO_ACCOUNT' });
  });
});
