import { Product } from '@/modules/catalog/domain/entities/Product';
import { IProductRepository, ProductFilters } from '@/modules/catalog/domain/repositories/ProductRepositoryInterface';

import { PaginationParams } from '@/shared/types/pagination.types';
import { getSkip } from '@/shared/utils/pagination';

export class InMemoryProductRepository implements IProductRepository {
  items: Product[] = [];

  async findPage({ search, categoryId, kind, stock, sortField, direction }: ProductFilters, pagination: PaginationParams) {
    const term = search.toLocaleLowerCase('pt-BR');
    const sign = direction === 'desc' ? -1 : 1;

    const filtered = this.items
      .filter((p) => !term || `${p.name} ${p.sku}`.toLocaleLowerCase('pt-BR').includes(term))
      .filter((p) => categoryId === undefined || p.categoryId === categoryId)
      .filter((p) => kind === undefined || p.kind === kind)
      .filter((p) => stock === undefined || (stock === 'low' ? p.stock < p.minStock : p.stock >= p.minStock))
      .sort((a, b) => {
        const x = a[sortField];
        const y = b[sortField];
        const cmp = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y, 'pt-BR', { sensitivity: 'base' }) : Number(x) - Number(y);
        return cmp * sign || a.id.localeCompare(b.id);
      });

    return { items: filtered.slice(getSkip(pagination), getSkip(pagination) + pagination.limit), total: filtered.length };
  }

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }
}
