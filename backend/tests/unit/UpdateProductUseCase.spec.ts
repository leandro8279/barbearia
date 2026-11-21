import { UpdateProductUseCase } from '@/modules/catalog/application/use-cases/UpdateProductUseCase';
import { Product } from '@/modules/catalog/domain/entities/Product';
import { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';

import { describe, expect, it, vi } from 'vitest';

import { InMemoryProductCategoryRepository } from '../fakes/InMemoryProductCategoryRepository';
import { InMemoryProductRepository } from '../fakes/InMemoryProductRepository';

const makeProduct = (id: string, sku: string) =>
  Product.restore({
    id,
    sku,
    name: 'Pomada matte',
    category: ProductCategory.restore({ id: 'cat-1', name: 'Cabelo', slug: 'cabelo' }),
    price: 3500,
    costCents: 1800,
    stock: 33,
    minStock: 5,
    kind: 'resale',
    commissionPct: 10,
    image: '',
    active: true,
  });

function makeSut() {
  const products = new InMemoryProductRepository();
  const categories = new InMemoryProductCategoryRepository();
  const auditLogger = { log: vi.fn(async () => {}) };

  categories.items.push(
    ProductCategory.restore({ id: 'cat-1', name: 'Cabelo', slug: 'cabelo' }),
    ProductCategory.restore({ id: 'cat-2', name: 'Barba', slug: 'barba' }),
  );
  products.items.push(makeProduct('prd-1', 'BAR-001'), makeProduct('prd-2', 'BAR-002'));

  return { products, auditLogger, sut: new UpdateProductUseCase(products, categories, auditLogger) };
}

const base = { id: 'prd-1', actorId: 'user-1' };

describe('UpdateProductUseCase', () => {
  it('atualiza só os campos informados, preserva o estoque e audita', async () => {
    const { auditLogger, sut } = makeSut();

    const result = await sut.execute({ ...base, name: '  Pomada brilho ', price: 4500, categoryId: 'cat-2', active: false });

    if (result.isLeft()) throw result.value;
    expect(result.value).toMatchObject({
      name: 'Pomada brilho',
      price: 4500,
      categoryId: 'cat-2',
      categoryName: 'Barba',
      active: false,
      sku: 'BAR-001',
      costCents: 1800,
      stock: 33,
    });
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalog.product.update', actorId: 'user-1', entityId: 'prd-1', details: { sku: 'BAR-001' } }),
    );
  });

  it('aceita reenviar o próprio SKU', async () => {
    const { sut } = makeSut();

    expect((await sut.execute({ ...base, sku: 'BAR-001' })).isRight()).toBe(true);
  });

  it('permite string vazia para remover a imagem', async () => {
    const { products, sut } = makeSut();
    await sut.execute({ ...base, image: '/seed/a.svg' });

    await sut.execute({ ...base, image: '' });

    expect(products.items[0].image).toBe('');
  });

  it('devolve Left(404) quando o produto não existe e não audita', async () => {
    const { auditLogger, sut } = makeSut();

    const result = await sut.execute({ ...base, id: 'inexistente', name: 'X1' });

    expect(result.value).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('devolve Left(422) quando a categoria não existe e não altera nada', async () => {
    const { products, auditLogger, sut } = makeSut();

    const result = await sut.execute({ ...base, categoryId: 'inexistente', name: 'Novo nome' });

    expect(result.value).toMatchObject({ statusCode: 422, code: 'INVALID_PRODUCT_CATEGORY' });
    expect(products.items[0].name).toBe('Pomada matte');
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('devolve Left(409) quando o SKU pertence a outro produto', async () => {
    const { products, auditLogger, sut } = makeSut();

    const result = await sut.execute({ ...base, sku: 'BAR-002' });

    expect(result.value).toMatchObject({ statusCode: 409, code: 'PRODUCT_SKU_ALREADY_EXISTS' });
    expect(products.items[0].sku).toBe('BAR-001');
    expect(auditLogger.log).not.toHaveBeenCalled();
  });
});
