import { GetAdminProductUseCase } from '@/modules/catalog/application/use-cases/GetAdminProductUseCase';
import { Product } from '@/modules/catalog/domain/entities/Product';
import { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';

import { describe, expect, it } from 'vitest';

import { InMemoryProductRepository } from '../fakes/InMemoryProductRepository';

const makeProduct = (id = 'prd-1') =>
  Product.restore({
    id,
    sku: 'BAR-001',
    name: 'Pomada matte',
    category: ProductCategory.restore({ id: 'cat-1', name: 'Cabelo', slug: 'cabelo' }),
    price: 3500,
    costCents: 1800,
    stock: 33,
    minStock: 5,
    kind: 'resale',
    commissionPct: 10,
    image: '/seed/product-hair.svg',
    active: true,
  });

function makeSut() {
  const products = new InMemoryProductRepository();
  const sut = new GetAdminProductUseCase(products);
  return { products, sut };
}

describe('GetAdminProductUseCase', () => {
  it('devolve o produto com a categoria achatada', async () => {
    const { products, sut } = makeSut();
    products.items.push(makeProduct());

    const result = await sut.execute({ id: 'prd-1' });

    if (result.isLeft()) throw result.value;
    expect(result.value).toMatchObject({
      id: 'prd-1',
      sku: 'BAR-001',
      categoryId: 'cat-1',
      categoryName: 'Cabelo',
      price: 3500,
      costCents: 1800,
      kind: 'resale',
    });
  });

  it('devolve Left(NotFoundError) quando o produto não existe', async () => {
    const { sut } = makeSut();

    const result = await sut.execute({ id: 'inexistente' });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});
