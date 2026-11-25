import { FINANCE_BASES } from '@/modules/finance/domain/entities/FinanceSummary';
import { resolvePeriod } from '@/modules/finance/domain/services/financeCalendar';

import { z } from '@/shared/openapi/zod';

const PERIOD_MESSAGE = 'Informe um período válido.';
const BASIS_MESSAGE = 'Selecione um regime financeiro válido.';

export const financeSummaryQuerySchema = z
  .object({
    from: z.string({ error: PERIOD_MESSAGE }).trim().min(1, PERIOD_MESSAGE),
    to: z.string({ error: PERIOD_MESSAGE }).trim().min(1, PERIOD_MESSAGE),
    basis: z.enum(FINANCE_BASES, { error: BASIS_MESSAGE }).default('cash'),
  })
  .transform(({ from, to, basis }, ctx) => {
    const period = resolvePeriod(from, to);

    if (!period) {
      ctx.addIssue({ code: 'custom', message: PERIOD_MESSAGE, path: ['to'] });
      return z.NEVER;
    }

    return { from: period.start, to: period.end, basis };
  });

export type FinanceSummaryQuery = z.infer<typeof financeSummaryQuerySchema>;
