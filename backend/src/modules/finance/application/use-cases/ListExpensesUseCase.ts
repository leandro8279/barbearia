import { toExpenseResponse } from '@/modules/finance/application/dtos/ExpenseResponseDTO';
import { ListExpensesDTO, ListExpensesResponseDTO } from '@/modules/finance/application/dtos/ListExpensesDTO';
import { IExpenseRepository } from '@/modules/finance/domain/repositories/ExpenseRepositoryInterface';
import { resolveCategoryFilter } from '@/modules/finance/domain/services/expenseCategories';
import { startOfLocalDay } from '@/modules/finance/domain/services/financeCalendar';

import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListExpensesUseCase implements IUseCase<ListExpensesDTO, ListExpensesResponseDTO> {
  constructor(
    private readonly expenseRepository: IExpenseRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute({ page, pageSize, category, ...filters }: ListExpensesDTO): Promise<ListExpensesResponseDTO> {
    const now = this.now();

    const { items, total } = await this.expenseRepository.findPage(
      {
        ...filters,
        categories: category ? resolveCategoryFilter(category) : undefined,
        overdueBefore: startOfLocalDay(now),
      },
      { page, limit: pageSize },
    );

    return {
      items: items.map((expense) => toExpenseResponse(expense, now)),
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    };
  }
}
