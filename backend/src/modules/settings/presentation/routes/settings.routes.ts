import { ExpressControllerAdapter } from '@/shared/adapters/ExpressRouteAdapter';
import { IController } from '@/shared/interfaces/HttpInterface';
import { requirePermission } from '@/shared/middlewares/RequirePermission.middleware';

import { RequestHandler, Router } from 'express';

export interface SettingsControllers {
  getBusinessSettings: IController;
}

export function buildSettingsRoutes(controllers: SettingsControllers, auth: RequestHandler): Router {
  const router = Router();

  router.get('/admin/settings/business', auth, requirePermission('settings.read'), ExpressControllerAdapter(controllers.getBusinessSettings));

  return router;
}
