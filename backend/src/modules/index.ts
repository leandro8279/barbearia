import { makeAuthModule } from '@/modules/auth';

import { Router } from 'express';

export function registerModules(): Router {
  const router = Router();

  router.use(makeAuthModule());

  return router;
}
