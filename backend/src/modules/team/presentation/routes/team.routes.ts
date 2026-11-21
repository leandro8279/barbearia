import { ExpressControllerAdapter } from '@/shared/adapters/ExpressRouteAdapter';
import { IController } from '@/shared/interfaces/HttpInterface';
import { requirePermission } from '@/shared/middlewares/RequirePermission.middleware';

import { RequestHandler, Router } from 'express';

export interface TeamControllers {
  listTeamUsers: IController;
}

export function buildTeamRoutes(controllers: TeamControllers, auth: RequestHandler): Router {
  const router = Router();

  router.get('/admin/users', auth, requirePermission('team.manage'), ExpressControllerAdapter(controllers.listTeamUsers));

  return router;
}
