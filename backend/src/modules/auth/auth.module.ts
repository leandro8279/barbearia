import { env } from '@/config';
import { AppDataSource } from '@/config/database';
import { logger } from '@/config/logger';

import { ForgotPasswordUseCase } from '@/modules/auth/application/use-cases/ForgotPasswordUseCase';
import { GetMeUseCase } from '@/modules/auth/application/use-cases/GetMeUseCase';
import { GuestUseCase } from '@/modules/auth/application/use-cases/GuestUseCase';
import { LoginUseCase } from '@/modules/auth/application/use-cases/LoginUseCase';
import { LogoutUseCase } from '@/modules/auth/application/use-cases/LogoutUseCase';
import { RegisterUseCase } from '@/modules/auth/application/use-cases/RegisterUseCase';
import { ResetPasswordUseCase } from '@/modules/auth/application/use-cases/ResetPasswordUseCase';
import { TypeOrmPasswordResetRepository } from '@/modules/auth/infra/database/typeorm/repositories/TypeOrmPasswordResetRepository';
import { ForgotPasswordController } from '@/modules/auth/presentation/controllers/ForgotPasswordController';
import { GetMeController } from '@/modules/auth/presentation/controllers/GetMeController';
import { GuestController } from '@/modules/auth/presentation/controllers/GuestController';
import { LoginController } from '@/modules/auth/presentation/controllers/LoginController';
import { LogoutController } from '@/modules/auth/presentation/controllers/LogoutController';
import { RegisterController } from '@/modules/auth/presentation/controllers/RegisterController';
import { ResetPasswordController } from '@/modules/auth/presentation/controllers/ResetPasswordController';
import { buildRegisterRoutes } from '@/modules/auth/presentation/routes/auth.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { loginFailedAttempts } from '@/shared/middlewares/RateLimit.middleware';
import { hashProvider, mailProvider, tokenProvider } from '@/shared/providers';
import { TypeOrmAuditLogger } from '@/shared/providers/audit/TypeOrmAuditLogger';

import { Router } from 'express';

export function makeAuthModule(): Router {
  const userRepository = new TypeOrmUserRepository(AppDataSource);
  const auditLogger = new TypeOrmAuditLogger(AppDataSource, logger);
  const passwordResetRepository = new TypeOrmPasswordResetRepository(AppDataSource);

  return buildRegisterRoutes(
    {
      register: new RegisterController(new RegisterUseCase(userRepository, hashProvider, tokenProvider, auditLogger)),
      me: new GetMeController(new GetMeUseCase(userRepository)),
      guest: new GuestController(new GuestUseCase(userRepository, tokenProvider, auditLogger)),
      logout: new LogoutController(new LogoutUseCase(userRepository, auditLogger)),
      forgot: new ForgotPasswordController(
        new ForgotPasswordUseCase(userRepository, passwordResetRepository, mailProvider, auditLogger, `${env.WEB_URL}/reset-password`),
      ),
      reset: new ResetPasswordController(new ResetPasswordUseCase(userRepository, passwordResetRepository, hashProvider, auditLogger)),
      login: new LoginController(new LoginUseCase(userRepository, hashProvider, tokenProvider, auditLogger, loginFailedAttempts)),
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
