import { ExpressControllerAdapter } from '@/shared/adapters/ExpressRouteAdapter';
import { IController } from '@/shared/interfaces/HttpInterface';
import { rateLimits } from '@/shared/middlewares/RateLimit.middleware';

import { RequestHandler, Router } from 'express';

export interface AuthControllers {
  me: IController;
  guest: IController;
  logout: IController;
  register: IController;
  forgot: IController;
  reset: IController;
  login: IController;
}

export function buildRegisterRoutes(controllers: AuthControllers, auth: RequestHandler): Router {
  const router = Router();

  router.post('/auth/register', rateLimits.register, ExpressControllerAdapter(controllers.register));
  router.get('/auth/me', auth, ExpressControllerAdapter(controllers.me));
  router.post('/auth/guest', rateLimits.guest, ExpressControllerAdapter(controllers.guest));
  router.post('/auth/logout', auth, ExpressControllerAdapter(controllers.logout));
  router.post('/auth/forgot', rateLimits.forgot, ExpressControllerAdapter(controllers.forgot));
  router.post('/auth/reset', rateLimits.reset, ExpressControllerAdapter(controllers.reset));
  router.post('/auth/login', rateLimits.login, ExpressControllerAdapter(controllers.login));

  return router;
}
