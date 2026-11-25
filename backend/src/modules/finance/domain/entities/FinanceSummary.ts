import type { PaymentMethod } from '@/modules/tabs/domain/entities/Payment';

/** cash = regime de caixa (pagamentos/despesas pagas); accrual = competência (comandas/despesas por vencimento). */
export const FINANCE_BASES = ['cash', 'accrual'] as const;
export type FinanceBasis = (typeof FINANCE_BASES)[number];

export interface FinanceMetrics {
  revenueCents: number;
  expensesCents: number;
  profitCents: number;
  averageTicketCents: number;
  commissionsToPayCents: number;
  tabsCount: number;
}

export interface MonthlyFlow {
  month: string; // YYYY-MM (America/Sao_Paulo)
  incomeCents: number;
  expensesCents: number;
}

export interface PaymentMethodTotal {
  method: PaymentMethod;
  amountCents: number;
}

export interface FinanceSummary {
  metrics: FinanceMetrics;
  monthly: MonthlyFlow[];
  paymentMethods: PaymentMethodTotal[];
}

/**
 * Fatos já resolvidos pelo regime: `at` é a data que o regime usa para enquadrar o valor no período.
 * Quem resolve isso é o repositório; o domínio só agrega.
 */
export interface DatedAmount {
  at: Date;
  amountCents: number;
}

export interface IncomeFact extends DatedAmount {
  tabId: string;
}

export interface PaymentFact extends IncomeFact {
  method: string;
}

export interface FinanceFacts {
  incomes: IncomeFact[];
  payments: PaymentFact[];
  expenses: DatedAmount[];
  /** Somente comissões pendentes, datadas pela comanda de origem. */
  commissions: DatedAmount[];
}
