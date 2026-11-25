import { EXPENSE_SORT_FIELDS, EXPENSE_STATUS_FILTERS } from '@/modules/finance/domain/repositories/ExpenseRepositoryInterface';
import { isDateOnly, parseBoundary } from '@/modules/finance/domain/services/financeCalendar';

import { z } from '@/shared/openapi/zod';

const STATUS_MESSAGE = 'Selecione um status de despesa válido.';

const dueBound = (endOfDay: boolean) =>
  z
    .string()
    .trim()
    .transform((value) => {
      const day = value.slice(0, 10);

      return isDateOnly(day) ? (parseBoundary(day, endOfDay) ?? undefined) : undefined;
    })
    .optional()
    .catch(undefined);

export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .transform((n) => Math.min(n, 100))
    .catch(10),
  q: z.string().trim().catch(''),
  category: z
    .string()
    .trim()
    .transform((v) => v || undefined)
    .optional()
    .catch(undefined),
  status: z.preprocess((value) => (value === '' ? undefined : value), z.enum(EXPENSE_STATUS_FILTERS, { error: STATUS_MESSAGE }).default('all')),
  from: dueBound(false),
  to: dueBound(true),
  sort: z.enum(EXPENSE_SORT_FIELDS).catch('dueAt'),
  order: z.enum(['asc', 'desc']).catch('asc'),
});

export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
