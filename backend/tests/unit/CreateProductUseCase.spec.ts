import { CreateProductUseCase } from '@/modules/catalog/application/use-cases/CreateProductUseCase';
import { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';

import { describe, expect, it, vi } from 'vitest';

import { InMemoryProductCategoryRepository } from '../fakes/InMemoryProductCategoryRepository';
import { InMemoryProductRepository } from '../fakes/InMemoryProductRepository';

const baseInput = {
  sku: 'BAR-021',
  name: 'Pomada matte',
  categoryId: 'cat-1',
  price: 3500,
  costCents: 1800,
  stock: 10,
  minStock: 5,
  kind: 'resale' as const,
  commissionPct: 10,
  image: '',
  active: true,
  actorId: 'user-1',
};

function makeSut() {
  const products = new InMemoryProductRepository();
  const categories = new InMemoryProductCategoryRepository();
  const auditLogger = { log: vi.fn(async () => {}) };
  const sut = new CreateProductUseCase(products, categories, auditLogger);

  categories.items.push(ProductCategory.restore({ id: 'cat-1', name: 'Cabelo', slug: 'cabelo' }));

  return { products, categories, auditLogger, sut };
}

describe('CreateProductUseCase', () => {
  it('cria o produto com a categoria achatada e audita', async () => {
    const { products, auditLogger, sut } = makeSut();

    const result = await sut.execute(baseInput);

    if (result.isLeft()) throw result.value;
    expect(result.value).toMatchObject({ sku: 'BAR-021', categoryId: 'cat-1', categoryName: 'Cabelo', stock: 10, kind: 'resale', active: true });
    expect(products.items).toHaveLength(1);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalog.product.create', actorId: 'user-1', entityId: result.value.id, details: { sku: 'BAR-021' } }),
    );
  });

  it('devolve Left(422) quando a categoria não existe e não audita', async () => {
    const { products, auditLogger, sut } = makeSut();

    const result = await sut.execute({ ...baseInput, categoryId: 'inexistente' });

    expect(result.value).toMatchObject({ statusCode: 422, code: 'INVALID_PRODUCT_CATEGORY' });
    expect(products.items).toHaveLength(0);
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('devolve Left(409) quando o SKU já existe', async () => {
    const { products, auditLogger, sut } = makeSut();
    await sut.execute(baseInput);

    const result = await sut.execute(baseInput);

    expect(result.value).toMatchObject({ statusCode: 409, code: 'PRODUCT_SKU_ALREADY_EXISTS' });
    expect(products.items).toHaveLength(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
  });
});
