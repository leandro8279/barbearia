import type {
  FinanceBasis,
  FinanceMetrics,
  FinanceSummary,
  MonthlyFlow,
  PaymentMethodTotal,
} from '@/modules/finance/domain/entities/FinanceSummary';

export interface GetFinanceSummaryDTO {
  /** Início inclusivo do período (já resolvido no fuso America/Sao_Paulo). */
  from: Date;
  /** Fim inclusivo do período. */
  to: Date;
  basis: FinanceBasis;
}

export interface FinanceMetricsDTO {
  revenueCents: number;
  expensesCents: number;
  profitCents: number;
  averageTicketCents: number;
  commissionsToPayCents: number;
  tabsCount: number;
}

export interface MonthlyFlowDTO {
  month: string;
  incomeCents: number;
  expensesCents: number;
}

export interface PaymentMethodTotalDTO {
  method: PaymentMethodTotal['method'];
  amountCents: number;
}

export interface FinanceSummaryResponseDTO {
  basis: FinanceBasis;
  metrics: FinanceMetricsDTO;
  previous: FinanceMetricsDTO;
  monthly: MonthlyFlowDTO[];
  paymentMethods: PaymentMethodTotalDTO[];
}

function toMetrics(metrics: FinanceMetrics): FinanceMetricsDTO {
  return {
    revenueCents: metrics.revenueCents,
    expensesCents: metrics.expensesCents,
    profitCents: metrics.profitCents,
    averageTicketCents: metrics.averageTicketCents,
    commissionsToPayCents: metrics.commissionsToPayCents,
    tabsCount: metrics.tabsCount,
  };
}

const toMonthlyFlow = ({ month, incomeCents, expensesCents }: MonthlyFlow): MonthlyFlowDTO => ({ month, incomeCents, expensesCents });

export function toFinanceSummaryResponse(basis: FinanceBasis, current: FinanceSummary, previous: FinanceSummary): FinanceSummaryResponseDTO {
  return {
    basis,
    metrics: toMetrics(current.metrics),
    previous: toMetrics(previous.metrics),
    monthly: current.monthly.map(toMonthlyFlow),
    paymentMethods: current.paymentMethods.map(({ method, amountCents }) => ({ method, amountCents })),
  };
}
