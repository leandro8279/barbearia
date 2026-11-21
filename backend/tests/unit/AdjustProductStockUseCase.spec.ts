import { AdjustProductStockUseCase } from '@/modules/catalog/application/use-cases/AdjustProductStockUseCase';
import { Product } from '@/modules/catalog/domain/entities/Product';
import { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';

import { describe, expect, it, vi } from 'vitest';

import { InMemoryProductRepository } from '../fakes/InMemoryProductRepository';

const makeProduct = (stock = 10) =>
  Product.restore({
    id: 'prd-1',
    sku: 'BAR-001',
    name: 'Pomada matte',
    category: ProductCategory.restore({ id: 'cat-1', name: 'Cabelo', slug: 'cabelo' }),
    price: 3500,
    costCents: 1800,
    stock,
    minStock: 5,
    kind: 'resale',
    commissionPct: 10,
    image: '',
    active: true,
  });

function makeSut(stock = 10) {
  const products = new InMemoryProductRepository();
  const auditLogger = { log: vi.fn(async () => {}) };
  products.items.push(makeProduct(stock));

  return { products, auditLogger, sut: new AdjustProductStockUseCase(products, auditLogger) };
}

const input = { id: 'prd-1', delta: -3, reason: 'Contagem de inventário', actorId: 'user-1' };

describe('AdjustProductStockUseCase', () => {
  it('ajusta o estoque, grava a movimentação e audita', async () => {
    const { products, auditLogger, sut } = makeSut(10);

    const result = await sut.execute(input);

    if (result.isLeft()) throw result.value;
    expect(result.value.product.stock).toBe(7);
    expect(result.value.movement).toMatchObject({ productId: 'prd-1', type: 'adjust', qty: -3, userId: 'user-1' });
    expect(products.movements).toHaveLength(1);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalog.product.stock.adjust', actorId: 'user-1', entityId: 'prd-1', details: { delta: -3, reason: 'Contagem de inventário' } }),
    );
  });

  it('aceita entrada de estoque (delta positivo)', async () => {
    const { sut } = makeSut(1);

    const result = await sut.execute({ ...input, delta: 5 });

    if (result.isLeft()) throw result.value;
    expect(result.value.product.stock).toBe(6);
  });

  it('permite zerar o estoque', async () => {
    const { sut } = makeSut(3);

    expect((await sut.execute(input)).isRight()).toBe(true);
  });

  it('devolve Left(409) quando o estoque ficaria negativo, sem gravar nem auditar', async () => {
    const { products, auditLogger, sut } = makeSut(2);

    const result = await sut.execute(input);

    expect(result.value).toMatchObject({ statusCode: 409, code: 'INSUFFICIENT_STOCK', details: { available: 2 } });
    expect(products.items[0].stock).toBe(2);
    expect(products.movements).toHaveLength(0);
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('devolve Left(404) quando o produto não existe', async () => {
    const { auditLogger, sut } = makeSut();

    const result = await sut.execute({ ...input, id: 'inexistente' });

    expect(result.value).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(auditLogger.log).not.toHaveBeenCalled();
  });
});
