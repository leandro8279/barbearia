import { describe, expect, it } from 'vitest';
import { GetUserUseCase } from '@/modules/auth/application/use-cases/GetUserUseCase';
import { User } from '@/modules/auth/domain/entities/User';
import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

function makeSut() {
  const repo = new InMemoryUserRepository();
  const sut = new GetUserUseCase(repo);
  return { repo, sut };
}

describe('GetUserUseCase', () => {
  it('devolve Right quando encontra', async () => {
    const { repo, sut } = makeSut();
    const entity = await repo.create(User.create({ name: 'Exemplo' }));

    const result = await sut.execute({ id: entity.id });

    if (result.isLeft()) throw result.value;
    expect(result.value.id).toBe(entity.id);
  });

  it('devolve Left(NotFoundError) quando não encontra', async () => {
    const { sut } = makeSut();

    const result = await sut.execute({ id: 'inexistente' });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ statusCode: 404 });
  });
});
