import { AppDataSource } from '@/config/database';

import { GetFinanceSummaryUseCase } from '@/modules/finance/application/use-cases/GetFinanceSummaryUseCase';
import { TypeOrmFinanceSummaryRepository } from '@/modules/finance/infra/repositories/TypeOrmFinanceSummaryRepository';
import { GetFinanceSummaryController } from '@/modules/finance/presentation/controllers/GetFinanceSummaryController';
import { buildFinanceRoutes } from '@/modules/finance/presentation/routes/finance.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';

import { Router } from 'express';

export function makeFinanceModule(): Router {
  const userRepository = new TypeOrmUserRepository(AppDataSource);
  const financeRepository = new TypeOrmFinanceSummaryRepository(AppDataSource);

  return buildFinanceRoutes(
    {
      getFinanceSummary: new GetFinanceSummaryController(new GetFinanceSummaryUseCase(financeRepository)),
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
