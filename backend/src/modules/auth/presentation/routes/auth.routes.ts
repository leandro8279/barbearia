import { RequestHandler, Router } from 'express';

export interface AuthControllers {
  register: IController;
}

export function buildRegisterRoutes(controllers: RegisterControllers, auth: RequestHandler): Router {
  const router = Router();

  // plop:routes

  return router;
}
