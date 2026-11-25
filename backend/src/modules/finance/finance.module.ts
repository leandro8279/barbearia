import { AppDataSource } from '@/config/database';

import { GetFinanceSummaryUseCase, ListExpenseCategoriesUseCase, ListExpensesUseCase } from '@/modules/finance/application/use-cases';
import { TypeOrmExpenseRepository, TypeOrmFinanceSummaryRepository } from '@/modules/finance/infra/repositories';
import { GetFinanceSummaryController, ListExpenseCategoriesController, ListExpensesController } from '@/modules/finance/presentation/controllers';
import { buildFinanceRoutes } from '@/modules/finance/presentation/routes/finance.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';

import { Router } from 'express';

export function makeFinanceModule(): Router {
  const userRepository = new TypeOrmUserRepository(AppDataSource);
  const financeRepository = new TypeOrmFinanceSummaryRepository(AppDataSource);
  const expenseRepository = new TypeOrmExpenseRepository(AppDataSource);

  return buildFinanceRoutes(
    {
      getFinanceSummary: new GetFinanceSummaryController(new GetFinanceSummaryUseCase(financeRepository)),
      listExpenses: new ListExpensesController(new ListExpensesUseCase(expenseRepository)),
      listExpenseCategories: new ListExpenseCategoriesController(new ListExpenseCategoriesUseCase()),
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
