import { ExpressControllerAdapter } from '@/shared/adapters/ExpressRouteAdapter';
import { IController } from '@/shared/interfaces/HttpInterface';
import { rateLimits } from '@/shared/middlewares/RateLimit.middleware';

import { RequestHandler, Router } from 'express';

export interface AuthControllers {
  register: IController;
}

export function buildRegisterRoutes(controllers: AuthControllers, _auth: RequestHandler): Router {
  const router = Router();

  router.post('/auth/register', rateLimits.register, ExpressControllerAdapter(controllers.register));

  // plop:routes

  return router;
}
