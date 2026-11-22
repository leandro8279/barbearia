import { ExpressControllerAdapter } from '@/shared/adapters/ExpressRouteAdapter';
import { IController } from '@/shared/interfaces/HttpInterface';
import { requirePermission } from '@/shared/middlewares/RequirePermission.middleware';

import { RequestHandler, Router } from 'express';

export interface CustomersControllers {
  listAdminCustomers: IController;
}

export function buildCustomersRoutes(controllers: CustomersControllers, auth: RequestHandler): Router {
  const router = Router();

  router.get('/admin/customers', auth, requirePermission('customers.read'), ExpressControllerAdapter(controllers.listAdminCustomers));

  return router;
}
