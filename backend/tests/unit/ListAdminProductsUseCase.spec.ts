import { ListAdminProductsUseCase } from '@/modules/catalog/application/use-cases/ListAdminProductsUseCase';
import { Product, ProductKind } from '@/modules/catalog/domain/entities/Product';
import { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';

import { describe, expect, it } from 'vitest';

import { InMemoryProductRepository } from '../fakes/InMemoryProductRepository';

const makeProduct = (
  id: string,
  name: string,
  over: Partial<{ sku: string; categoryId: string; kind: ProductKind; stock: number; minStock: number; price: number }> = {},
) =>
  Product.restore({
    id,
    sku: over.sku ?? `SKU-${id}`,
    name,
    category: ProductCategory.restore({ id: over.categoryId ?? 'cat-1', name: 'Cabelo', slug: 'cabelo' }),
    price: over.price ?? 3500,
    costCents: 1800,
    stock: over.stock ?? 10,
    minStock: over.minStock ?? 5,
    kind: over.kind ?? 'resale',
    commissionPct: 10,
    image: '',
    active: true,
  });

const base = { page: 1, pageSize: 20, search: '', sortField: 'name' as const, direction: 'asc' as const };

function makeSut() {
  const products = new InMemoryProductRepository();
  return { products, sut: new ListAdminProductsUseCase(products) };
}

describe('ListAdminProductsUseCase', () => {
  it('pagina e devolve total, page e pageSize', async () => {
    const { products, sut } = makeSut();
    products.items.push(makeProduct('1', 'A'), makeProduct('2', 'B'), makeProduct('3', 'C'));

    const result = await sut.execute({ ...base, page: 2, pageSize: 2 });

    expect(result).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(result.items.map((i) => i.name)).toEqual(['C']);
  });

  it('busca por nome ou sku', async () => {
    const { products, sut } = makeSut();
    products.items.push(makeProduct('1', 'Pomada', { sku: 'POM-1' }), makeProduct('2', 'Shampoo', { sku: 'SHA-1' }));

    expect((await sut.execute({ ...base, search: 'pom' })).items).toHaveLength(1);
    expect((await sut.execute({ ...base, search: 'sha-1' })).items[0].name).toBe('Shampoo');
  });

  it('filtra por categoria e tipo', async () => {
    const { products, sut } = makeSut();
    products.items.push(makeProduct('1', 'A', { categoryId: 'c1', kind: 'resale' }), makeProduct('2', 'B', { categoryId: 'c2', kind: 'supply' }));

    expect((await sut.execute({ ...base, categoryId: 'c2' })).items.map((i) => i.id)).toEqual(['2']);
    expect((await sut.execute({ ...base, kind: 'resale' })).items.map((i) => i.id)).toEqual(['1']);
  });

  it('stock=low traz abaixo do mínimo; stock=ok traz igual ou acima', async () => {
    const { products, sut } = makeSut();
    products.items.push(
      makeProduct('1', 'Baixo', { stock: 2, minStock: 5 }),
      makeProduct('2', 'Limite', { stock: 5, minStock: 5 }),
      makeProduct('3', 'Folgado', { stock: 20, minStock: 5 }),
    );

    expect((await sut.execute({ ...base, stock: 'low' })).items.map((i) => i.name)).toEqual(['Baixo']);
    expect((await sut.execute({ ...base, stock: 'ok' })).items.map((i) => i.name)).toEqual(['Folgado', 'Limite']);
  });

  it('ordena por campo numérico em ordem decrescente', async () => {
    const { products, sut } = makeSut();
    products.items.push(makeProduct('1', 'A', { price: 1000 }), makeProduct('2', 'B', { price: 3000 }));

    const result = await sut.execute({ ...base, sortField: 'price', direction: 'desc' });

    expect(result.items.map((i) => i.id)).toEqual(['2', '1']);
  });

  it('devolve a categoria achatada (categoryId e categoryName)', async () => {
    const { products, sut } = makeSut();
    products.items.push(makeProduct('1', 'Pomada matte', { categoryId: 'cat-9' }));

    const result = await sut.execute(base);

    expect(result.items[0]).toMatchObject({ categoryId: 'cat-9', categoryName: 'Cabelo', commissionPct: 10, active: true });
  });
});
