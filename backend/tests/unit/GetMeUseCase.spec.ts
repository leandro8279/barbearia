import { GetMeUseCase } from '@/modules/auth/application/use-cases/GetMeUseCase';
import { User } from '@/modules/users';

import { describe, expect, it } from 'vitest';

import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

function makeSut() {
  const repo = new InMemoryUserRepository();
  const sut = new GetMeUseCase(repo);
  return { repo, sut };
}

const base = { name: 'João', email: 'joao@email.com', passwordHash: 'hash' };

describe('GetMeUseCase', () => {
  it('devolve Right com o usuário', async () => {
    const { repo, sut } = makeSut();
    const user = await repo.create(User.create(base));

    const result = await sut.execute({ id: user.id, tokenVersion: 0 });

    if (result.isLeft()) throw result.value;
    expect(result.value.user.id).toBe(user.id);
  });

  it('devolve Left(401) quando o usuário não existe', async () => {
    const { sut } = makeSut();
    const result = await sut.execute({ id: 'x' });
    expect(result.value).toMatchObject({ statusCode: 401 });
  });

  it('devolve Left(401) quando o tokenVersion divergiu', async () => {
    const { repo, sut } = makeSut();
    const user = await repo.create(User.create({ ...base, tokenVersion: 1 }));
    const result = await sut.execute({ id: user.id, tokenVersion: 0 });
    expect(result.isLeft()).toBe(true);
  });

  it('devolve Left(401) quando o usuário está inativo', async () => {
    const { repo, sut } = makeSut();
    const user = await repo.create(User.create({ ...base, active: false }));
    const result = await sut.execute({ id: user.id });
    expect(result.isLeft()).toBe(true);
  });

  it('não expõe passwordHash nem tokenVersion', async () => {
    const { repo, sut } = makeSut();
    const user = await repo.create(User.create(base));

    const result = await sut.execute({ id: user.id });

    if (result.isLeft()) throw result.value;
    expect(result.value.user).not.toHaveProperty('passwordHash');
    expect(result.value.user).not.toHaveProperty('tokenVersion');
  });
});
