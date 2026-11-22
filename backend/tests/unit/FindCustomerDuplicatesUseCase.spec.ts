import { FindCustomerDuplicatesUseCase } from '@/modules/customers/application/use-cases/FindCustomerDuplicatesUseCase';

import { describe, expect, it, vi } from 'vitest';

import { InMemoryCustomerRepository } from '../fakes/InMemoryCustomerRepository';

const make = (id: string, name: string, phone: string | null = null) => ({ id, name, phone });

function makeSut() {
  const customers = new InMemoryCustomerRepository();
  return { customers, sut: new FindCustomerDuplicatesUseCase(customers) };
}

describe('FindCustomerDuplicatesUseCase', () => {
  it('devolve lista vazia, sem consultar o repositório, quando não há critério suficiente', async () => {
    const { customers, sut } = makeSut();
    const spy = vi.spyOn(customers, 'findSummaries');
    customers.items.push(make('1', 'João Silva', '62999998888'));

    expect(await sut.execute({ phone: '6299', name: 'jo' })).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('encontra por telefone ignorando máscara e DDI 55', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(make('1', 'Maria', '62999998888'), make('2', 'Outra', '62911112222'));

    const result = await sut.execute({ phone: '+55 (62) 99999-8888', name: '' });

    expect(result).toEqual([{ id: '1', name: 'Maria', phone: '62999998888', matchedBy: ['phone'] }]);
  });

  it('encontra por nome ignorando acentos, caixa e espaços nas pontas', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(make('1', 'João da Silva', '62999998888'));

    const result = await sut.execute({ phone: '', name: '  JOAO DA SILVA ' });

    expect(result).toEqual([{ id: '1', name: 'João da Silva', phone: '62999998888', matchedBy: ['name'] }]);
  });

  it('marca telefone e nome quando os dois casam', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(make('1', 'João Silva', '62999998888'));

    const result = await sut.execute({ phone: '62999998888', name: 'joao silva' });

    expect(result[0].matchedBy).toEqual(['phone', 'name']);
  });

  it('ignora o telefone curto e busca só pelo nome', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(make('1', 'Carlos', '62999998888'));

    const result = await sut.execute({ phone: '6299', name: 'carlos' });

    expect(result.map((r) => r.matchedBy)).toEqual([['name']]);
  });

  it('não quebra com cliente sem telefone e devolve string vazia', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(make('1', 'Carlos', null));

    const result = await sut.execute({ phone: '62999998888', name: 'carlos' });

    expect(result).toEqual([{ id: '1', name: 'Carlos', phone: '', matchedBy: ['name'] }]);
  });

  it('ordena telefone primeiro e depois por nome', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(make('a', 'Carlos', '62911112222'), make('b', 'Bruno', '62999998888'), make('c', 'Abel', '62999998888'));

    const result = await sut.execute({ phone: '62999998888', name: 'carlos' });

    expect(result.map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });

  it('ignora o excludeId', async () => {
    const { customers, sut } = makeSut();
    customers.items.push(make('1', 'Maria', '62999998888'), make('2', 'Maria B', '62999998888'));

    const result = await sut.execute({ phone: '62999998888', name: '', excludeId: '1' });

    expect(result.map((r) => r.id)).toEqual(['2']);
  });

  it('limita a 5 resultados', async () => {
    const { customers, sut } = makeSut();
    for (let i = 1; i <= 7; i++) customers.items.push(make(String(i), `Cliente ${i}`, '62999998888'));

    expect(await sut.execute({ phone: '62999998888', name: '' })).toHaveLength(5);
  });
});
