import { ProductResponseDTO, toProductResponse } from '@/modules/catalog/application/dtos/ProductResponseDTO';
import { UpdateProductDTO } from '@/modules/catalog/application/dtos/UpdateProductDTO';
import { InvalidProductCategoryError } from '@/modules/catalog/application/errors/InvalidProductCategoryError';
import { ProductSkuAlreadyExistsError } from '@/modules/catalog/application/errors/ProductSkuAlreadyExistsError';
import { IProductCategoryRepository } from '@/modules/catalog/domain/repositories/ProductCategoryRepositoryInterface';
import { IProductRepository } from '@/modules/catalog/domain/repositories/ProductRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

import type { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';
export type UpdateProductError = NotFoundError | InvalidProductCategoryError | ProductSkuAlreadyExistsError;
export type UpdateProductOutput = Either<UpdateProductError, ProductResponseDTO>;

export class UpdateProductUseCase implements IUseCase<UpdateProductDTO, UpdateProductOutput> {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: IProductCategoryRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ id, actorId, categoryId, ...changes }: UpdateProductDTO): Promise<UpdateProductOutput> {
    const product = await this.productRepository.findById(id);
    if (!product) return left(new NotFoundError('Produto'));

    let category: ProductCategory | undefined;
    if (categoryId !== undefined && categoryId !== product.categoryId) {
      category = (await this.categoryRepository.findById(categoryId)) ?? undefined;
      if (!category) return left(new InvalidProductCategoryError());
    }

    if (changes.sku !== undefined && changes.sku !== product.sku) {
      const owner = await this.productRepository.findBySku(changes.sku);
      if (owner && owner.id !== product.id) return left(new ProductSkuAlreadyExistsError());
    }

    product.update({ ...changes, category });

    try {
      await this.productRepository.update(product);
    } catch (error) {
      if (error instanceof ProductSkuAlreadyExistsError) return left(error);
      throw error;
    }

    await this.auditLogger.log({
      actorId,
      action: 'catalog.product.update',
      entity: 'products',
      entityId: product.id,
      details: { sku: product.sku },
    });

    return right(toProductResponse(product));
  }
}
