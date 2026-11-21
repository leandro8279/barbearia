import { makeAuthModule } from '@/modules/auth';
import { makeCatalogModule } from '@/modules/catalog';
import { makeTeamModule } from '@/modules/team';

import { Router } from 'express';

export function registerModules(): Router {
  const router = Router();

  router.use(makeAuthModule());
  router.use(makeCatalogModule());
  router.use(makeTeamModule());

  return router;
}
