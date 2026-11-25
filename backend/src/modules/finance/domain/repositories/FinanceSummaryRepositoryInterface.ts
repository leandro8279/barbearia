import type { FinanceBasis, FinanceFacts } from '@/modules/finance/domain/entities/FinanceSummary';

export interface FinanceFactsQuery {
  basis: FinanceBasis;
  /** Janela inclusiva; cobre o período atual e o anterior de uma só vez. */
  from: Date;
  to: Date;
}

export interface IFinanceSummaryRepository {
  findFacts(query: FinanceFactsQuery): Promise<FinanceFacts>;
}
