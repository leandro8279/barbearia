import { ListAdminProductsDTO, ListAdminProductsResponseDTO } from '@/modules/catalog/application/dtos/ListAdminProductsDTO';
import { toProductResponse } from '@/modules/catalog/application/dtos/ProductResponseDTO';
import { IProductRepository } from '@/modules/catalog/domain/repositories/ProductRepositoryInterface';

import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListAdminProductsUseCase implements IUseCase<ListAdminProductsDTO, ListAdminProductsResponseDTO> {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute({ page, pageSize, ...filters }: ListAdminProductsDTO): Promise<ListAdminProductsResponseDTO> {
    const { items, total } = await this.productRepository.findPage(filters, { page, limit: pageSize });

    return { items: items.map(toProductResponse), total, page, pageSize };
  }
}
