// tests/unit/LoginUseCase.spec.ts
import { LoginUseCase } from '@/modules/auth/application/use-cases/LoginUseCase';
import { User } from '@/modules/users';

import { InMemoryRateLimiter } from '@/shared/providers/rate-limiter/InMemoryRateLimiter';

import { describe, expect, it, vi } from 'vitest';

import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

function makeSut() {
  const repo = new InMemoryUserRepository();
  const hashProvider = { hash: vi.fn(async (p: string) => `hashed:${p}`), compare: vi.fn(async (p: string, h: string) => h === `hashed:${p}`) };
  const tokenProvider = { sign: vi.fn(() => 'token'), verify: vi.fn() };
  const auditLogger = { log: vi.fn(async () => {}) };
  const failedAttempts = new InMemoryRateLimiter({ windowMs: 60_000, maxAttempts: 2 });
  const sut = new LoginUseCase(repo, hashProvider, tokenProvider, auditLogger, failedAttempts);
  return { repo, hashProvider, auditLogger, failedAttempts, sut };
}

const base = { name: 'João', email: 'joao@email.com', phone: '62999998888', passwordHash: 'hashed:senha-forte-123' };
const input = { identifier: 'JOAO@email.com', password: 'senha-forte-123' };

describe('LoginUseCase', () => {
  it('autentica por e-mail, registra lastAccessAt e audita', async () => {
    const { repo, auditLogger, sut } = makeSut();
    const user = await repo.create(User.create(base));

    const result = await sut.execute(input);

    if (result.isLeft()) throw result.value;
    expect(result.value.token).toBe('token');
    expect(result.value.user).not.toHaveProperty('tokenVersion');
    expect(user.lastAccessAt).toBeInstanceOf(Date);
    expect(auditLogger.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.login' }));
  });

  it('autentica por telefone com DDI 55 e máscara', async () => {
    const { repo, sut } = makeSut();
    await repo.create(User.create(base));

    const result = await sut.execute({ ...input, identifier: '+55 (62) 99999-8888' });

    expect(result.isRight()).toBe(true);
  });

  it('staffOnly rejeita cliente e telefone', async () => {
    const { repo, sut } = makeSut();
    await repo.create(User.create(base));

    expect((await sut.execute({ ...input, staffOnly: true })).value).toMatchObject({ statusCode: 401 });
    expect((await sut.execute({ ...input, identifier: '62999998888', staffOnly: true })).isLeft()).toBe(true);
  });

  it('staffOnly aceita barbeiro', async () => {
    const { repo, sut } = makeSut();
    await repo.create(User.create({ ...base, role: 'barber' }));

    expect((await sut.execute({ ...input, staffOnly: true })).isRight()).toBe(true);
  });

  it('senha errada e usuário inexistente dão o mesmo 401 e comparam hash nos dois casos', async () => {
    const { repo, hashProvider, sut } = makeSut();
    await repo.create(User.create(base));

    const wrong = await sut.execute({ ...input, password: 'errada' });
    const ghost = await sut.execute({ ...input, identifier: 'ninguem@email.com' });

    expect(wrong.value).toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
    expect(ghost.value).toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
    expect(hashProvider.compare).toHaveBeenCalledTimes(2);
  });

  it('guest (sem senha) não autentica', async () => {
    const { repo, sut } = makeSut();
    await repo.create(User.create({ name: 'Guest', email: 'joao@email.com', phone: '62999998888', guest: true }));

    expect((await sut.execute(input)).value).toMatchObject({ statusCode: 401 });
  });

  it('inativo com senha correta devolve 403', async () => {
    const { repo, sut } = makeSut();
    await repo.create(User.create({ ...base, active: false }));

    expect((await sut.execute(input)).value).toMatchObject({ statusCode: 403, code: 'USER_INACTIVE' });
  });

  it('só falhas consomem o limiter', async () => {
    const { repo, failedAttempts, sut } = makeSut();
    await repo.create(User.create(base));

    await sut.execute({ ...input, ip: '1.1.1.1' });
    expect(await failedAttempts.status('1.1.1.1')).toEqual({ allowed: true });

    await sut.execute({ ...input, password: 'x', ip: '1.1.1.1' });
    await sut.execute({ ...input, password: 'x', ip: '1.1.1.1' });
    expect((await failedAttempts.status('1.1.1.1')).allowed).toBe(false);
  });

  it('persiste só lastAccessAt, sem salvar a entidade inteira', async () => {
    const { repo, sut } = makeSut();
    await repo.create(User.create(base));
    const updateSpy = vi.spyOn(repo, 'update');
    const touchSpy = vi.spyOn(repo, 'touchLastAccess');

    await sut.execute(input);

    expect(touchSpy).toHaveBeenCalledOnce();
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
