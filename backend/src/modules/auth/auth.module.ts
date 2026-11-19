import { AppDataSource } from '@/config/database';

import { RegisterUseCase } from '@/modules/auth/application/use-cases/RegisterUseCase';
import { RegisterController } from '@/modules/auth/presentation/controllers/RegisterController';
import { buildRegisterRoutes } from '@/modules/auth/presentation/routes/auth.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { hashProvider, tokenProvider } from '@/shared/providers';

import { Router } from 'express';

export function makeAuthModule(): Router {
  const userRepository = new TypeOrmUserRepository(AppDataSource);

  return buildRegisterRoutes(
    {
      register: new RegisterController(new RegisterUseCase(userRepository, hashProvider, tokenProvider)),
      // plop:controllers
    },
    makeAuthMiddleware(tokenProvider),
  );
}
