import { makeAuthModule } from '@/modules/auth';
import { makeCatalogModule } from '@/modules/catalog';
import { makeCustomersModule } from '@/modules/customers';
import { makeFinanceModule } from '@/modules/finance';
import { makeSettingsModule } from '@/modules/settings';
import { makeTeamModule } from '@/modules/team';

import { Router } from 'express';

export function registerModules(): Router {
  const router = Router();

  router.use(makeAuthModule());
  router.use(makeCatalogModule());
  router.use(makeTeamModule());
  router.use(makeCustomersModule());
  router.use(makeSettingsModule());
  router.use(makeFinanceModule());

  return router;
}
