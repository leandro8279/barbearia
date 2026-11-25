import {
  FinanceSummaryResponseDTO,
  GetFinanceSummaryDTO,
  toFinanceSummaryResponse,
} from '@/modules/finance/application/dtos/GetFinanceSummaryDTO';
import { IFinanceSummaryRepository } from '@/modules/finance/domain/repositories/FinanceSummaryRepositoryInterface';
import { previousPeriod } from '@/modules/finance/domain/services/financeCalendar';
import { computeFinanceSummary } from '@/modules/finance/domain/services/financeSummary';

import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GetFinanceSummaryUseCase implements IUseCase<GetFinanceSummaryDTO, FinanceSummaryResponseDTO> {
  constructor(private readonly financeRepository: IFinanceSummaryRepository) {}

  async execute({ from, to, basis }: GetFinanceSummaryDTO): Promise<FinanceSummaryResponseDTO> {
    const period = { start: from, end: to };
    const previous = previousPeriod(period);

    // Uma única ida ao banco cobre o período atual e o anterior.
    const facts = await this.financeRepository.findFacts({ basis, from: previous.start, to: period.end });

    return toFinanceSummaryResponse(basis, computeFinanceSummary(facts, period), computeFinanceSummary(facts, previous));
  }
}
