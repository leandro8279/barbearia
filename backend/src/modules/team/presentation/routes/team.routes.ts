import { ExpressControllerAdapter } from '@/shared/adapters/ExpressRouteAdapter';
import { IController } from '@/shared/interfaces/HttpInterface';
import { requirePermission } from '@/shared/middlewares/RequirePermission.middleware';

import { RequestHandler, Router } from 'express';

export interface TeamControllers {
  listTeamUsers: IController;
  inviteTeamUser: IController;
  updateTeamMember: IController;
}

export function buildTeamRoutes(controllers: TeamControllers, auth: RequestHandler): Router {
  const router = Router();

  router.get('/admin/users', auth, requirePermission('team.manage'), ExpressControllerAdapter(controllers.listTeamUsers));
  router.post('/admin/users/invite', auth, requirePermission('team.manage'), ExpressControllerAdapter(controllers.inviteTeamUser));
  router.patch('/admin/users/:id', auth, requirePermission('team.manage'), ExpressControllerAdapter(controllers.updateTeamMember));

  return router;
}
