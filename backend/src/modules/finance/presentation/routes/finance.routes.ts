import { ExpressControllerAdapter } from '@/shared/adapters/ExpressRouteAdapter';
import { IController } from '@/shared/interfaces/HttpInterface';
import { requirePermission } from '@/shared/middlewares/RequirePermission.middleware';

import { RequestHandler, Router } from 'express';

export interface FinanceControllers {
  getFinanceSummary: IController;
}

export function buildFinanceRoutes(controllers: FinanceControllers, auth: RequestHandler): Router {
  const router = Router();

  router.get('/admin/finance/summary', auth, requirePermission('finance.read'), ExpressControllerAdapter(controllers.getFinanceSummary));

  return router;
}
