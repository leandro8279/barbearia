import { AppDataSource } from '@/config/database';

import { GetBusinessSettingsUseCase } from '@/modules/settings/application/use-cases';
import { TypeOrmSettingsRepository, TypeOrmUnitRepository } from '@/modules/settings/infra/repositories';
import { GetBusinessSettingsController } from '@/modules/settings/presentation/controllers';
import { buildSettingsRoutes } from '@/modules/settings/presentation/routes/settings.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';

import { Router } from 'express';

export function makeSettingsModule(): Router {
  const unitRepository = new TypeOrmUnitRepository(AppDataSource);
  const settingsRepository = new TypeOrmSettingsRepository(AppDataSource);
  const userRepository = new TypeOrmUserRepository(AppDataSource);

  return buildSettingsRoutes(
    {
      getBusinessSettings: new GetBusinessSettingsController(new GetBusinessSettingsUseCase(unitRepository, settingsRepository)),
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
