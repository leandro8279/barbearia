import type { AdjustProductStockResponseDTO } from '@/modules/catalog/application/dtos/AdjustProductStockDTO';
import { STOCK_MOVEMENT_TYPES } from '@/modules/catalog/domain/entities/StockMovement';
import { AdminProductSchema } from '@/modules/catalog/presentation/docs/products.docs';
import { adjustProductStockBodySchema } from '@/modules/catalog/presentation/validators/adjustProductStock.schema';
import { getAdminProductParamsSchema } from '@/modules/catalog/presentation/validators/getAdminProduct.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

const StockMovementSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  type: z.enum(STOCK_MOVEMENT_TYPES).openapi({ example: 'adjust' }),
  qty: z.number().int().openapi({ example: -2 }),
  reason: z.string().openapi({ example: 'Contagem de inventário' }),
  userId: z.string().nullable(),
  tabId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const AdjustProductStockResponseSchema = registry.register(
  'AdjustProductStockResponse',
  z.object({ product: AdminProductSchema, movement: StockMovementSchema }),
);

type AssertAdjustStockDocMatchesDTO = AdjustProductStockResponseDTO extends z.infer<typeof AdjustProductStockResponseSchema> ? true : never;
export const assertAdjustStockDocMatchesDTO: AssertAdjustStockDocMatchesDTO = true;

registry.registerPath({
  method: 'post',
  path: '/api/admin/catalog/products/{id}/adjust-stock',
  tags: ['Catálogo'],
  summary: 'Ajustar estoque do produto (admin)',
  description:
    'Soma `delta` ao estoque (negativo = saída) e registra a movimentação e a auditoria, de forma atômica. Nunca deixa o estoque negativo. Exige a permissão catalog.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: getAdminProductParamsSchema, body: { content: jsonContent(adjustProductStockBodySchema) } },
  responses: {
    200: { description: 'Estoque ajustado', content: jsonContent(AdjustProductStockResponseSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Produto não encontrado', content: errorContent },
    409: { description: 'O ajuste deixaria o estoque negativo', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
  },
});
