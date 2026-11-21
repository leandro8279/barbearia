import { AppDataSource } from '@/config/database';

import { ListTeamUsersUseCase } from '@/modules/team/application/use-cases';
import { ListTeamUsersController } from '@/modules/team/presentation/controllers';
import { buildTeamRoutes } from '@/modules/team/presentation/routes/team.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';

import { Router } from 'express';

export function makeTeamModule(): Router {
  const userRepository = new TypeOrmUserRepository(AppDataSource);

  return buildTeamRoutes(
    { listTeamUsers: new ListTeamUsersController(new ListTeamUsersUseCase(userRepository)) },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
