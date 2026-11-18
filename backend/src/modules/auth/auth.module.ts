import { buildRegisterRoutes } from '@/modules/auth/presentation/routes/auth.routes';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';

import { Router } from 'express';

export function makeAuthModule(): Router {
  return buildRegisterRoutes(
    {
      // plop:controllers
    },
    makeAuthMiddleware(tokenProvider),
  );
}
