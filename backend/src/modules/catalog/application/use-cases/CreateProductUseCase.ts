import { CreateProductDTO } from '@/modules/catalog/application/dtos/CreateProductDTO';
import { ProductResponseDTO, toProductResponse } from '@/modules/catalog/application/dtos/ProductResponseDTO';
import { InvalidProductCategoryError } from '@/modules/catalog/application/errors/InvalidProductCategoryError';
import { ProductSkuAlreadyExistsError } from '@/modules/catalog/application/errors/ProductSkuAlreadyExistsError';
import { Product } from '@/modules/catalog/domain/entities/Product';
import { IProductCategoryRepository } from '@/modules/catalog/domain/repositories/ProductCategoryRepositoryInterface';
import { IProductRepository } from '@/modules/catalog/domain/repositories/ProductRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

export type CreateProductError = InvalidProductCategoryError | ProductSkuAlreadyExistsError;
export type CreateProductOutput = Either<CreateProductError, ProductResponseDTO>;

export class CreateProductUseCase implements IUseCase<CreateProductDTO, CreateProductOutput> {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: IProductCategoryRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ actorId, categoryId, ...data }: CreateProductDTO): Promise<CreateProductOutput> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) return left(new InvalidProductCategoryError());

    if (await this.productRepository.findBySku(data.sku)) return left(new ProductSkuAlreadyExistsError());

    const product = Product.create({ ...data, category });

    try {
      await this.productRepository.create(product);
    } catch (error) {
      // Requisição concorrente criou o mesmo SKU entre a checagem e o insert.
      if (error instanceof ProductSkuAlreadyExistsError) return left(error);
      throw error;
    }

    await this.auditLogger.log({
      actorId,
      action: 'catalog.product.create',
      entity: 'products',
      entityId: product.id,
      details: { sku: product.sku },
    });

    return right(toProductResponse(product));
  }
}
