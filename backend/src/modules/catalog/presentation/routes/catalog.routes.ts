import { ExpressControllerAdapter } from '@/shared/adapters/ExpressRouteAdapter';
import { IController } from '@/shared/interfaces/HttpInterface';
import { requirePermission } from '@/shared/middlewares/RequirePermission.middleware';

import { RequestHandler, Router } from 'express';

export interface CatalogControllers {
  listAdminServices: IController;
  getAdminService: IController;
  createService: IController;
  setServiceActive: IController;
  listAdminProducts: IController;
}

export function buildCatalogRoutes(controllers: CatalogControllers, auth: RequestHandler): Router {
  const router = Router();

  router.get('/admin/catalog/services', auth, requirePermission('catalog.read'), ExpressControllerAdapter(controllers.listAdminServices));
  router.get('/admin/catalog/services/:id', auth, requirePermission('catalog.write'), ExpressControllerAdapter(controllers.getAdminService));
  router.patch(
    '/admin/catalog/services/:id/active',
    auth,
    requirePermission('catalog.write'),
    ExpressControllerAdapter(controllers.setServiceActive),
  );
  router.post('/admin/catalog/services', auth, requirePermission('catalog.write'), ExpressControllerAdapter(controllers.createService));
  router.get('/admin/catalog/products', auth, requirePermission('catalog.read'), ExpressControllerAdapter(controllers.listAdminProducts));

  return router;
}
