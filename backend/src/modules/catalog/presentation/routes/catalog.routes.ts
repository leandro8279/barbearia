import { ExpressControllerAdapter } from '@/shared/adapters/ExpressRouteAdapter';
import { IController } from '@/shared/interfaces/HttpInterface';
import { requirePermission } from '@/shared/middlewares/RequirePermission.middleware';

import { RequestHandler, Router } from 'express';

export interface CatalogControllers {
  listAdminServices: IController;
  getAdminService: IController;
}

export function buildCatalogRoutes(controllers: CatalogControllers, auth: RequestHandler): Router {
  const router = Router();

  router.get('/admin/catalog/services', auth, requirePermission('catalog.read'), ExpressControllerAdapter(controllers.listAdminServices));
  router.get('/admin/catalog/services/:id', auth, requirePermission('catalog.write'), ExpressControllerAdapter(controllers.getAdminService));
  
  return router;
}
