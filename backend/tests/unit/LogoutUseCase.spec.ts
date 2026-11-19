import { LogoutUseCase } from '@/modules/auth/application/use-cases/LogoutUseCase';
import { User } from '@/modules/users';

// tests/unit/LogoutUseCase.spec.ts
import { describe, expect, it, vi } from 'vitest';

import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

function makeSut() {
  const repo = new InMemoryUserRepository();
  const auditLogger = { log: vi.fn().mockResolvedValue(undefined) };
  return { repo, auditLogger, sut: new LogoutUseCase(repo, auditLogger) };
}

describe('LogoutUseCase', () => {
  it('incrementa tokenVersion e registra auditoria', async () => {
    const { repo, auditLogger, sut } = makeSut();
    const user = await repo.create(User.create({ name: 'João', email: 'joao@email.com', passwordHash: 'x' }));

    const result = await sut.execute({ userId: user.id });

    expect(result.isRight()).toBe(true);
    expect(user.tokenVersion).toBe(1);
    expect(auditLogger.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.logout', actorId: user.id }));
  });

  it('devolve Left(Unauthorized) quando o usuário não existe', async () => {
    const { sut } = makeSut();

    const result = await sut.execute({ userId: 'inexistente' });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ statusCode: 401 });
  });
});
