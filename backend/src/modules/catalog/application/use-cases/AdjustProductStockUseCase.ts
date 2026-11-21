import {
  AdjustProductStockDTO,
  AdjustProductStockResponseDTO,
  toStockMovementResponse,
} from '@/modules/catalog/application/dtos/AdjustProductStockDTO';
import { toProductResponse } from '@/modules/catalog/application/dtos/ProductResponseDTO';
import { InsufficientStockError } from '@/modules/catalog/application/errors/InsufficientStockError';
import { StockMovement } from '@/modules/catalog/domain/entities/StockMovement';
import { IProductRepository } from '@/modules/catalog/domain/repositories/ProductRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

export type AdjustProductStockOutput = Either<NotFoundError | InsufficientStockError, AdjustProductStockResponseDTO>;

export class AdjustProductStockUseCase implements IUseCase<AdjustProductStockDTO, AdjustProductStockOutput> {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ id, delta, reason, actorId }: AdjustProductStockDTO): Promise<AdjustProductStockOutput> {
    const product = await this.productRepository.findById(id);
    if (!product) return left(new NotFoundError('Produto'));
    if (!product.canAdjustStock(delta)) return left(new InsufficientStockError(product.stock));

    const movement = StockMovement.create({ productId: id, qty: delta, reason, userId: actorId });

    // A checagem acima dá o erro rápido; a do repositório protege contra corrida entre requisições.
    const updated = await this.productRepository.applyStockAdjustment(movement);
    if (!updated) return left(new InsufficientStockError(product.stock));

    await this.auditLogger.log({
      actorId,
      action: 'catalog.product.stock.adjust',
      entity: 'products',
      entityId: id,
      details: { delta, reason: movement.reason },
    });

    return right({ product: toProductResponse(updated), movement: toStockMovementResponse(movement) });
  }
}
