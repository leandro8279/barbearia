import { AppDataSource } from '@/config/database';
import { logger } from '@/config/logger';

import { RegisterUseCase } from '@/modules/auth/application/use-cases/RegisterUseCase';
import { RegisterController } from '@/modules/auth/presentation/controllers/RegisterController';
import { buildRegisterRoutes } from '@/modules/auth/presentation/routes/auth.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { hashProvider, tokenProvider } from '@/shared/providers';
import { TypeOrmAuditLogger } from '@/shared/providers/audit/TypeOrmAuditLogger';

import { Router } from 'express';

export function makeAuthModule(): Router {
  const userRepository = new TypeOrmUserRepository(AppDataSource);
  const auditLogger = new TypeOrmAuditLogger(AppDataSource, logger);

  return buildRegisterRoutes(
    {
      register: new RegisterController(new RegisterUseCase(userRepository, hashProvider, tokenProvider, auditLogger)),
    },
    makeAuthMiddleware(tokenProvider),
  );
}
