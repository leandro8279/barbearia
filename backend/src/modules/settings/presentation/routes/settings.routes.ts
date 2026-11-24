import { ExpressControllerAdapter } from '@/shared/adapters/ExpressRouteAdapter';
import { IController } from '@/shared/interfaces/HttpInterface';
import { requirePermission } from '@/shared/middlewares/RequirePermission.middleware';

import { RequestHandler, Router } from 'express';

export interface SettingsControllers {
  getBusinessSettings: IController;
  updateBusinessSettings: IController;
  getBusinessHours: IController;
  saveBusinessHours: IController;
  getNotificationSettings: IController;
  saveNotificationSettings: IController;
  resendNotification: IController;
}

export function buildSettingsRoutes(controllers: SettingsControllers, auth: RequestHandler): Router {
  const router = Router();

  router.get('/admin/settings/business', auth, requirePermission('settings.read'), ExpressControllerAdapter(controllers.getBusinessSettings));
  router.patch('/admin/settings/business', auth, requirePermission('settings.write'), ExpressControllerAdapter(controllers.updateBusinessSettings));
  router.get('/admin/settings/hours', auth, requirePermission('settings.write'), ExpressControllerAdapter(controllers.getBusinessHours));
  router.patch('/admin/settings/hours', auth, requirePermission('settings.write'), ExpressControllerAdapter(controllers.saveBusinessHours));
  router.get(
    '/admin/settings/notifications',
    auth,
    requirePermission('settings.write'),
    ExpressControllerAdapter(controllers.getNotificationSettings),
  );
  router.patch(
    '/admin/settings/notifications',
    auth,
    requirePermission('settings.write'),
    ExpressControllerAdapter(controllers.saveNotificationSettings),
  );
  router.post(
    '/admin/settings/notifications/:id/resend',
    auth,
    requirePermission('settings.write'),
    ExpressControllerAdapter(controllers.resendNotification),
  );
  return router;
}
