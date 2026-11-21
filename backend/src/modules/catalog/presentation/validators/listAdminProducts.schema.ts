import { PRODUCT_KINDS } from '@/modules/catalog/domain/entities/Product';
import { PRODUCT_SORT_FIELDS } from '@/modules/catalog/domain/repositories/ProductRepositoryInterface';

import { z } from '@/shared/openapi/zod';

export const listAdminProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .transform((n) => Math.min(n, 100))
    .catch(20),
  q: z.string().trim().catch(''),
  categoryId: z
    .string()
    .trim()
    .transform((v) => v || undefined)
    .optional()
    .catch(undefined),
  kind: z.enum(PRODUCT_KINDS).optional().catch(undefined),
  stock: z.enum(['low', 'ok']).optional().catch(undefined),
  sort: z.enum(PRODUCT_SORT_FIELDS).catch('name'),
  order: z.enum(['asc', 'desc']).catch('asc'),
});
