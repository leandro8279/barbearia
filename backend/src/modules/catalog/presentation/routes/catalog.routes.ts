import { ExpressControllerAdapter } from '@/shared/adapters/ExpressRouteAdapter';
import { IController } from '@/shared/interfaces/HttpInterface';
import { requirePermission } from '@/shared/middlewares/RequirePermission.middleware';

import { RequestHandler, Router } from 'express';

export interface CatalogControllers {
  listAdminServices: IController;
}

export function buildCatalogRoutes(controllers: CatalogControllers, auth: RequestHandler): Router {
  const router = Router();

  router.get('/admin/catalog/services', auth, requirePermission('catalog.read'), ExpressControllerAdapter(controllers.listAdminServices));

  return router;
}
