import { CUSTOMER_SORT_FIELDS } from '@/modules/customers/domain/entities/CustomerSummary';

import { z } from '@/shared/openapi/zod';

const NO_VISIT_MESSAGE = 'O filtro de ausência de visita é inválido.';

export const listAdminCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .transform((n) => Math.min(n, 100))
    .catch(20),
  q: z.string().trim().catch(''),
  // '' = sem filtro (como no legado); valor presente e inválido vira 422.
  noVisitDays: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number(NO_VISIT_MESSAGE).int(NO_VISIT_MESSAGE).min(1, NO_VISIT_MESSAGE).max(3650, NO_VISIT_MESSAGE).optional(),
  ),
  birthday: z.enum(['month']).optional().catch(undefined),
  sort: z.enum(CUSTOMER_SORT_FIELDS).catch('name'),
  order: z.enum(['asc', 'desc']).catch('asc'),
});
