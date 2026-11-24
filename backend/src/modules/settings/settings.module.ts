import { logger } from '@/config';
import { AppDataSource } from '@/config/database';

import {
  GetBusinessHoursUseCase,
  GetBusinessSettingsUseCase,
  SaveBusinessHoursUseCase,
  UpdateBusinessSettingsUseCase,
} from '@/modules/settings/application/use-cases';
import { TypeOrmSettingsRepository, TypeOrmUnitRepository, TypeOrmUpcomingAppointmentRepository } from '@/modules/settings/infra/repositories';
import {
  GetBusinessHoursController,
  GetBusinessSettingsController,
  SaveBusinessHoursController,
  UpdateBusinessSettingsController,
} from '@/modules/settings/presentation/controllers';
import { buildSettingsRoutes } from '@/modules/settings/presentation/routes/settings.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';
import { TypeOrmAuditLogger } from '@/shared/providers/audit/TypeOrmAuditLogger';

import { Router } from 'express';

export function makeSettingsModule(): Router {
  const unitRepository = new TypeOrmUnitRepository(AppDataSource);
  const settingsRepository = new TypeOrmSettingsRepository(AppDataSource);
  const userRepository = new TypeOrmUserRepository(AppDataSource);
  const upcomingAppointmentRepository = new TypeOrmUpcomingAppointmentRepository(AppDataSource);
  const auditLogger = new TypeOrmAuditLogger(AppDataSource, logger);

  return buildSettingsRoutes(
    {
      getBusinessSettings: new GetBusinessSettingsController(new GetBusinessSettingsUseCase(unitRepository, settingsRepository)),
      updateBusinessSettings: new UpdateBusinessSettingsController(
        new UpdateBusinessSettingsUseCase(unitRepository, settingsRepository, auditLogger),
      ),
      getBusinessHours: new GetBusinessHoursController(new GetBusinessHoursUseCase(unitRepository)),
      saveBusinessHours: new SaveBusinessHoursController(new SaveBusinessHoursUseCase(unitRepository, upcomingAppointmentRepository, auditLogger)),
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
