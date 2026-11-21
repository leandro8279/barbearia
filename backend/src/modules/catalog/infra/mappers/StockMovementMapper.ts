import { StockMovement } from '@/modules/catalog/domain/entities/StockMovement';
import { StockMovementEntity } from '@/modules/catalog/infra/entities/StockMovementEntity';

export class StockMovementMapper {
  static toDomain(entity: StockMovementEntity): StockMovement {
    return StockMovement.restore({ ...entity });
  }

  static toPersistence(movement: StockMovement): StockMovementEntity {
    return {
      id: movement.id,
      productId: movement.productId,
      type: movement.type,
      qty: movement.qty,
      reason: movement.reason,
      userId: movement.userId,
      createdAt: movement.createdAt,
    };
  }
}
