import { SERVICE_SORT_FIELDS } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

import { z } from '@/shared/openapi/zod';

export const listAdminServicesQuerySchema = z.object({
  _page: z.coerce.number().int().positive().catch(1),
  _limit: z.coerce
    .number()
    .int()
    .positive()
    .transform((n) => Math.min(n, 100))
    .catch(20),
  q: z.string().trim().catch(''),
  categoryId: z.coerce.number().int().positive().optional().catch(undefined),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .catch(undefined),
  _sort: z.enum(SERVICE_SORT_FIELDS).catch('name'),
  _order: z.enum(['asc', 'desc']).catch('asc'),
});
