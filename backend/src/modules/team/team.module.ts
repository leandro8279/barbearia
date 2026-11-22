import { env, logger } from '@/config';
import { AppDataSource } from '@/config/database';

import { InviteTeamUserUseCase, ListTeamUsersUseCase } from '@/modules/team/application/use-cases';
import { TypeOrmTeamInviteRepository } from '@/modules/team/infra/repositories/';
import { InviteTeamUserController, ListTeamUsersController } from '@/modules/team/presentation/controllers';
import { buildTeamRoutes } from '@/modules/team/presentation/routes/team.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { mailProvider, tokenProvider } from '@/shared/providers';
import { TypeOrmAuditLogger } from '@/shared/providers/audit/TypeOrmAuditLogger';

import { Router } from 'express';

export function makeTeamModule(): Router {
  const userRepository = new TypeOrmUserRepository(AppDataSource);
  const inviteRepository = new TypeOrmTeamInviteRepository(AppDataSource);
  const auditLogger = new TypeOrmAuditLogger(AppDataSource, logger);

  return buildTeamRoutes(
    {
      listTeamUsers: new ListTeamUsersController(new ListTeamUsersUseCase(userRepository)),

      inviteTeamUser: new InviteTeamUserController(
        new InviteTeamUserUseCase(userRepository, inviteRepository, mailProvider, auditLogger, `${env.WEB_URL}/reset-password`),
      ),
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
