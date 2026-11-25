import type { DatedAmount, FinanceFacts, FinanceSummary, MonthlyFlow } from '@/modules/finance/domain/entities/FinanceSummary';
import { FinancePeriod, monthKey, monthKeys } from '@/modules/finance/domain/services/financeCalendar';
import { PAYMENT_METHODS, PaymentMethod } from '@/modules/tabs/domain/entities/Payment';

const isPaymentMethod = (value: string): value is PaymentMethod => (PAYMENT_METHODS as readonly string[]).includes(value);

const sum = (items: DatedAmount[]): number => items.reduce((total, { amountCents }) => total + amountCents, 0);

export function computeFinanceSummary(facts: FinanceFacts, { start, end }: FinancePeriod): FinanceSummary {
  const from = start.getTime();
  const to = end.getTime();
  const inPeriod = <T extends { at: Date }>(items: T[]): T[] => items.filter(({ at }) => at.getTime() >= from && at.getTime() <= to);

  const incomes = inPeriod(facts.incomes);
  const expenses = inPeriod(facts.expenses);
  const commissions = inPeriod(facts.commissions);
  const payments = inPeriod(facts.payments);

  const monthly = new Map<string, MonthlyFlow>(
    monthKeys({ start, end }).map((month): [string, MonthlyFlow] => [month, { month, incomeCents: 0, expensesCents: 0 }]),
  );

  for (const { at, amountCents } of incomes) {
    const bucket = monthly.get(monthKey(at));
    if (bucket) bucket.incomeCents += amountCents;
  }
  for (const { at, amountCents } of expenses) {
    const bucket = monthly.get(monthKey(at));
    if (bucket) bucket.expensesCents += amountCents;
  }

  const totals = new Map<PaymentMethod, number>(PAYMENT_METHODS.map((method) => [method, 0]));
  for (const { method, amountCents } of payments) {
    // Forma de pagamento desconhecida entra na receita, mas não no detalhamento.
    if (isPaymentMethod(method)) totals.set(method, (totals.get(method) ?? 0) + amountCents);
  }

  const revenueCents = sum(incomes);
  const expensesCents = sum(expenses);
  const tabsCount = new Set(incomes.map(({ tabId }) => tabId)).size;

  return {
    metrics: {
      revenueCents,
      expensesCents,
      profitCents: revenueCents - expensesCents,
      averageTicketCents: tabsCount ? Math.round(revenueCents / tabsCount) : 0,
      commissionsToPayCents: sum(commissions),
      tabsCount,
    },
    monthly: [...monthly.values()],
    paymentMethods: PAYMENT_METHODS.map((method) => ({ method, amountCents: totals.get(method) ?? 0 })),
  };
}
