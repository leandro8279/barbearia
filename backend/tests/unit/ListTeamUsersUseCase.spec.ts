import { ListTeamUsersUseCase } from '@/modules/team/application/use-cases/ListTeamUsersUseCase';
import { User } from '@/modules/users';

import { describe, expect, it } from 'vitest';

import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

function makeSut() {
  const repo = new InMemoryUserRepository();
  return { repo, sut: new ListTeamUsersUseCase(repo) };
}

const base = { email: 'x@email.com', passwordHash: 'hash' };

describe('ListTeamUsersUseCase', () => {
  it('lista só equipe, ordenada por nome (pt-BR)', async () => {
    const { repo, sut } = makeSut();
    await repo.create(User.create({ ...base, name: 'Zeca', role: 'barber' }));
    await repo.create(User.create({ ...base, name: 'Cliente', role: 'customer' }));
    await repo.create(User.create({ ...base, name: 'Álvaro', role: 'admin' }));

    const result = await sut.execute();

    expect(result.users.map((u) => u.name)).toEqual(['Álvaro', 'Zeca']);
  });

  it('não expõe passwordHash nem tokenVersion e informa hasPassword', async () => {
    const { repo, sut } = makeSut();
    await repo.create(User.create({ name: 'Com senha', email: 'a@a.com', passwordHash: 'h', role: 'barber' }));
    await repo.create(User.create({ name: 'Sem senha', email: 'b@a.com', role: 'barber' }));

    const { users } = await sut.execute();

    expect(users[0]).not.toHaveProperty('passwordHash');
    expect(users[0]).not.toHaveProperty('tokenVersion');
    expect(users.map((u) => u.hasPassword)).toEqual([true, false]);
  });

  it('effectivePermissions soma papel e permissões individuais', async () => {
    const { repo, sut } = makeSut();
    await repo.create(User.create({ ...base, name: 'Rafa', role: 'barber', permissions: ['cash.read'] }));

    const [user] = (await sut.execute()).users;

    expect(user.effectivePermissions).toEqual(expect.arrayContaining(['agenda.read', 'commissions.read', 'cash.read']));
    expect(user.effectivePermissions).not.toContain('team.manage');
  });

  it('manager tem tudo, menos settings.manage', async () => {
    const { repo, sut } = makeSut();
    await repo.create(User.create({ ...base, name: 'Mari', role: 'manager' }));

    const [user] = (await sut.execute()).users;

    expect(user.effectivePermissions).toContain('team.manage');
    expect(user.effectivePermissions).not.toContain('settings.manage');
  });

  it('devolve roles, permissionKeys e roleDefaults por papel de equipe', async () => {
    const { sut } = makeSut();

    const result = await sut.execute();

    expect(result.roles).toEqual(['barber', 'reception', 'manager', 'admin']);
    expect(result.permissionKeys).toHaveLength(20);
    expect(result.roleDefaults.admin).toEqual(result.permissionKeys);
    expect(result.roleDefaults.reception).toEqual(expect.arrayContaining(['agenda.manage', 'cash.manage']));
    expect(result.roleDefaults.reception).not.toContain('team.manage');
    expect(result.roleDefaults).not.toHaveProperty('customer');
  });
});
