import { ListAdminCustomersUseCase } from '@/modules/customers/application/use-cases/ListAdminCustomersUseCase';

import { describe, expect, it } from 'vitest';

import { InMemoryCustomerRepository } from '../fakes/InMemoryCustomerRepository';

import type { CustomerSummary } from '@/modules/customers/domain/entities/CustomerSummary';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

const makeCustomer = (id: string, name: string, over: Partial<CustomerSummary> = {}): CustomerSummary => ({
  id,
  name,
  phone: '62999998888',
  birthDate: null,
  guest: false,
  tags: [],
  lastVisit: null,
  visitsCount: 0,
  totalSpentCents: 0,
  ...over,
});

const base = {
  page: 1,
  pageSize: 20,
  search: '',
  birthdayMonth: false,
  sortField: 'name' as const,
  direction: 'asc' as const,
  canViewFullPhone: true,
};

function makeSut() {
  const customers = new InMemoryCustomerRepository();
  return { customers, sut: new ListAdminCustomersUseCase(customers, () => NOW) };
}

describe('ListAdminCustomersUseCase', () => {
  it('pagina e devolve total, page e pageSize', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(makeCustomer('1', 'A'), makeCustomer('2', 'B'), makeCustomer('3', 'C'));

    const result = await sut.execute({ ...base, page: 2, pageSize: 2 });

    expect(result).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(result.items.map((i) => i.name)).toEqual(['C']);
  });

  it('ordena por nome em pt-BR ignorando acento', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(makeCustomer('1', 'Bruno'), makeCustomer('2', 'Ana'), makeCustomer('3', 'Álvaro'));

    const result = await sut.execute(base);

    expect(result.items.map((i) => i.name)).toEqual(['Álvaro', 'Ana', 'Bruno']);
  });

  it('busca por nome sem diferenciar acento e caixa', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(makeCustomer('1', 'João Silva'), makeCustomer('2', 'Maria'));

    const result = await sut.execute({ ...base, search: 'JOAO' });

    expect(result.items.map((i) => i.name)).toEqual(['João Silva']);
  });

  it('busca por telefone só para quem vê o telefone inteiro', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(makeCustomer('1', 'João', { phone: '62999998888' }), makeCustomer('2', 'Maria', { phone: '11988887777' }));

    const full = await sut.execute({ ...base, search: '6299999' });
    const masked = await sut.execute({ ...base, search: '6299999', canViewFullPhone: false });

    expect(full.items.map((i) => i.name)).toEqual(['João']);
    expect(masked.items).toHaveLength(0);
  });

  it('mascara o telefone sem permissão de escrita', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(makeCustomer('1', 'João'));

    const [masked] = (await sut.execute({ ...base, canViewFullPhone: false })).items;
    const [full] = (await sut.execute(base)).items;

    expect(masked).toMatchObject({ phone: '(**) *****-**88', phoneMasked: true });
    expect(full).toMatchObject({ phone: '62999998888', phoneMasked: false });
  });

  it('noVisitDays traz quem não vem há N dias ou nunca veio', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(
      makeCustomer('1', 'Recente', { lastVisit: daysAgo(5) }),
      makeCustomer('2', 'Antigo', { lastVisit: daysAgo(60) }),
      makeCustomer('3', 'Nunca'),
    );

    const result = await sut.execute({ ...base, noVisitDays: 30 });

    expect(result.items.map((i) => i.name)).toEqual(['Antigo', 'Nunca']);
  });

  it('filtra aniversariantes do mês e marca a tag', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(makeCustomer('1', 'Julho', { birthDate: '1990-07-20' }), makeCustomer('2', 'Janeiro', { birthDate: '1990-01-02' }));

    const result = await sut.execute({ ...base, birthdayMonth: true });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ name: 'Julho', tags: ['Aniversariante'] });
  });

  it('marca convidados como Visitante e normaliza as tags', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(makeCustomer('1', 'Guest', { guest: true, tags: [' vip ', 'vip', ''] }));

    const [item] = (await sut.execute(base)).items;

    expect(item.tags).toEqual(['vip', 'Visitante']);
  });

  it('ordena por última visita com quem nunca veio sempre no fim', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(
      makeCustomer('1', 'Nunca'),
      makeCustomer('2', 'Recente', { lastVisit: daysAgo(5) }),
      makeCustomer('3', 'Antigo', { lastVisit: daysAgo(10) }),
    );

    const asc = await sut.execute({ ...base, sortField: 'lastVisit', direction: 'asc' });
    const desc = await sut.execute({ ...base, sortField: 'lastVisit', direction: 'desc' });

    expect(asc.items.map((i) => i.name)).toEqual(['Antigo', 'Recente', 'Nunca']);
    expect(desc.items.map((i) => i.name)).toEqual(['Recente', 'Antigo', 'Nunca']);
  });

  it('ordena por total gasto decrescente, desempatando pelo id', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(
      makeCustomer('b', 'B', { totalSpentCents: 1000 }),
      makeCustomer('a', 'A', { totalSpentCents: 1000 }),
      makeCustomer('c', 'C', { totalSpentCents: 5000 }),
    );

    const result = await sut.execute({ ...base, sortField: 'totalSpentCents', direction: 'desc' });

    expect(result.items.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });
});
