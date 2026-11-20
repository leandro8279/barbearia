import { SERVICE_SORT_FIELDS } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

import { z } from '@/shared/openapi/zod';

export const listAdminServicesQuerySchema = z.object({
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
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .catch(undefined),
  sort: z.enum(SERVICE_SORT_FIELDS).catch('name'),
  order: z.enum(['asc', 'desc']).catch('asc'),
});
