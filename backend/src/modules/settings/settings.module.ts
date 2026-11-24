import { logger } from '@/config';
import { AppDataSource } from '@/config/database';

import {
    GetBusinessHoursUseCase, GetBusinessSettingsUseCase, GetNotificationSettingsUseCase,
    ResendNotificationUseCase, SaveBusinessHoursUseCase, SaveNotificationSettingsUseCase,
    UpdateBusinessSettingsUseCase
} from '@/modules/settings/application/use-cases';
import {
    TypeOrmMessageTemplateRepository, TypeOrmNotificationRepository, TypeOrmSettingsRepository,
    TypeOrmUnitRepository, TypeOrmUpcomingAppointmentRepository
} from '@/modules/settings/infra/repositories';
import {
    GetBusinessHoursController, GetBusinessSettingsController, GetNotificationSettingsController,
    ResendNotificationController, SaveBusinessHoursController, SaveNotificationSettingsController,
    UpdateBusinessSettingsController
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
  const notificationRepository = new TypeOrmNotificationRepository(AppDataSource);
  const messageTemplateRepository = new TypeOrmMessageTemplateRepository(AppDataSource);
  const auditLogger = new TypeOrmAuditLogger(AppDataSource, logger);

  return buildSettingsRoutes(
    {
      getBusinessSettings: new GetBusinessSettingsController(new GetBusinessSettingsUseCase(unitRepository, settingsRepository)),
      updateBusinessSettings: new UpdateBusinessSettingsController(
        new UpdateBusinessSettingsUseCase(unitRepository, settingsRepository, auditLogger),
      ),
      getBusinessHours: new GetBusinessHoursController(new GetBusinessHoursUseCase(unitRepository)),
      saveBusinessHours: new SaveBusinessHoursController(new SaveBusinessHoursUseCase(unitRepository, upcomingAppointmentRepository, auditLogger)),
      getNotificationSettings: new GetNotificationSettingsController(
        new GetNotificationSettingsUseCase(unitRepository, settingsRepository, messageTemplateRepository, notificationRepository),
      ),
      saveNotificationSettings: new SaveNotificationSettingsController(
        new SaveNotificationSettingsUseCase(unitRepository, settingsRepository, auditLogger),
      ),
      resendNotification: new ResendNotificationController(
        new ResendNotificationUseCase(notificationRepository, userRepository, settingsRepository, auditLogger),
      ),
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
