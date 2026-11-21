import type { ProductResponseDTO } from '@/modules/catalog/application/dtos/ProductResponseDTO';
import type { StockMovement, StockMovementType } from '@/modules/catalog/domain/entities/StockMovement';

export interface AdjustProductStockDTO {
  id: string;
  delta: number;
  reason: string;
  actorId: string;
}

export interface StockMovementResponseDTO {
  id: string;
  productId: string;
  type: StockMovementType;
  qty: number;
  reason: string;
  userId: string | null;
  tabId: string | null;
  createdAt: string;
}

export interface AdjustProductStockResponseDTO {
  product: ProductResponseDTO;
  movement: StockMovementResponseDTO;
}

export function toStockMovementResponse(movement: StockMovement): StockMovementResponseDTO {
  return {
    id: movement.id,
    productId: movement.productId,
    type: movement.type,
    qty: movement.qty,
    reason: movement.reason,
    userId: movement.userId,
    tabId: movement.tabId,
    createdAt: movement.createdAt.toISOString(),
  };
}
