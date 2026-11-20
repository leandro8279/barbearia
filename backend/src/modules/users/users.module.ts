import { AppDataSource } from '@/config/database';

import { makeAuthMiddleware } from '@/shared/middlewares/auth.middleware';
import { hashProvider, tokenProvider } from '@/shared/providers';

import { Router } from 'express';

import { CreateUserUseCase } from './application/use-cases/CreateUserUseCase';
import { GetUserUseCase } from './application/use-cases/GetUserUseCase';
import { ListUsersUseCase } from './application/use-cases/ListUsersUseCase';
import { TypeOrmUserRepository } from './infra/repositories/TypeOrmUserRepository';
import { CreateUserController } from './presentation/controllers/CreateUserController';
import { GetUserController } from './presentation/controllers/GetUserController';
import { ListUsersController } from './presentation/controllers/ListUsersController';
import { buildUserRoutes } from './presentation/routes/user.routes';

export function makeUsersModule(): Router {
  const userRepository = new TypeOrmUserRepository(AppDataSource);

  return buildUserRoutes(
    {
      create: new CreateUserController(new CreateUserUseCase(userRepository, hashProvider)),

      getById: new GetUserController(new GetUserUseCase(userRepository)),

      list: new ListUsersController(new ListUsersUseCase(userRepository)),
    },
    makeAuthMiddleware(tokenProvider),
  );
}
