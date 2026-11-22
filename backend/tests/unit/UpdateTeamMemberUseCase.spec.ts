import { UpdateTeamMemberUseCase } from '@/modules/team/application/use-cases/UpdateTeamMemberUseCase';
import { User } from '@/modules/users';

import { describe, expect, it, vi } from 'vitest';

import { InMemoryTeamRepository } from '../fakes/InMemoryTeamRepository';
import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

function makeSut() {
  const users = new InMemoryUserRepository();
  const team = new InMemoryTeamRepository(users);
  const auditLogger = { log: vi.fn(async () => {}) };
  const sut = new UpdateTeamMemberUseCase(users, team, auditLogger);

  return { users, team, auditLogger, sut };
}

const staff = (role: 'admin' | 'barber' | 'reception' | 'customer', email: string, active = true) =>
  User.create({ name: email, email, role, active, passwordHash: 'x' });

describe('UpdateTeamMemberUseCase', () => {
  it('atualiza papel, status e permissões (sem duplicatas), incrementa tokenVersion e audita', async () => {
    const { users, auditLogger, sut } = makeSut();
    const member = await users.create(staff('barber', 'b@x.com'));

    const result = await sut.execute({ id: member.id, role: 'reception', active: true, permissions: ['cash.read', 'cash.read'], actorId: 'admin-1' });

    if (result.isLeft()) throw result.value;
    expect(result.value.user).toMatchObject({ id: member.id, role: 'reception', permissions: ['cash.read'] });
    expect(result.value.user).not.toHaveProperty('tokenVersion');
    expect(member.tokenVersion).toBe(1);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'team.user.update',
        actorId: 'admin-1',
        entityId: member.id,
        details: { role: 'reception', active: true, permissions: ['cash.read'], roleChanged: true },
      }),
    );
  });

  it('mantém os campos omitidos e não revoga tokens quando o papel não muda', async () => {
    const { users, sut } = makeSut();
    const member = await users.create(User.create({ name: 'R', email: 'r@x.com', role: 'reception', permissions: ['cash.read'] }));

    const result = await sut.execute({ id: member.id, active: false, actorId: 'admin-1' });

    if (result.isLeft()) throw result.value;
    expect(member).toMatchObject({ role: 'reception', active: false, permissions: ['cash.read'], tokenVersion: 0 });
  });

  it('devolve Left(404) para usuário inexistente ou cliente, sem auditar', async () => {
    const { users, auditLogger, sut } = makeSut();
    const customer = await users.create(staff('customer', 'c@x.com'));

    expect((await sut.execute({ id: 'inexistente', actorId: 'a' })).value).toMatchObject({ statusCode: 404 });
    expect((await sut.execute({ id: customer.id, role: 'admin', actorId: 'a' })).value).toMatchObject({ statusCode: 404 });
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('devolve Left(409) ao rebaixar ou desativar o último admin ativo, sem alterar nada', async () => {
    const { users, auditLogger, sut } = makeSut();
    const admin = await users.create(staff('admin', 'a@x.com'));

    const demote = await sut.execute({ id: admin.id, role: 'manager' as never, actorId: admin.id });
    const deactivate = await sut.execute({ id: admin.id, active: false, actorId: admin.id });

    expect(demote.value).toMatchObject({ statusCode: 409, code: 'LAST_ACTIVE_ADMIN' });
    expect(deactivate.isLeft()).toBe(true);
    expect(admin).toMatchObject({ role: 'admin', active: true, tokenVersion: 0 });
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('permite desativar um admin quando existe outro ativo', async () => {
    const { users, sut } = makeSut();
    const first = await users.create(staff('admin', 'a1@x.com'));
    await users.create(staff('admin', 'a2@x.com'));

    const result = await sut.execute({ id: first.id, active: false, actorId: first.id });

    expect(result.isRight()).toBe(true);
    expect(first.active).toBe(false);
  });

  it('um admin inativo não conta como "outro admin ativo"', async () => {
    const { users, sut } = makeSut();
    const first = await users.create(staff('admin', 'a1@x.com'));
    await users.create(staff('admin', 'a2@x.com', false));

    expect((await sut.execute({ id: first.id, active: false, actorId: first.id })).value).toMatchObject({ statusCode: 409 });
  });

  it('devolve Left(409) e não audita quando o repositório barra por corrida', async () => {
    const { users, team, auditLogger, sut } = makeSut();
    const first = await users.create(staff('admin', 'a1@x.com'));
    await users.create(staff('admin', 'a2@x.com'));
    team.rejectNextSave = true;

    const result = await sut.execute({ id: first.id, active: false, actorId: first.id });

    expect(result.value).toMatchObject({ statusCode: 409, code: 'LAST_ACTIVE_ADMIN' });
    expect(auditLogger.log).not.toHaveBeenCalled();
  });
});
