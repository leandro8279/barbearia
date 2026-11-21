import { GetAdminProductDTO, GetAdminProductResponseDTO, toGetAdminProductResponse } from '@/modules/catalog/application/dtos/GetAdminProductDTO';
import { IProductRepository } from '@/modules/catalog/domain/repositories/ProductRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export type GetAdminProductOutput = Either<NotFoundError, GetAdminProductResponseDTO>;

export class GetAdminProductUseCase implements IUseCase<GetAdminProductDTO, GetAdminProductOutput> {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute({ id }: GetAdminProductDTO): Promise<GetAdminProductOutput> {
    const product = await this.productRepository.findById(id);
    if (!product) return left(new NotFoundError('Produto'));

    return right(toGetAdminProductResponse(product));
  }
}
