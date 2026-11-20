import { AppDataSource } from '@/config/database';

import { ListAdminServicesUseCase } from '@/modules/catalog/application/use-cases/ListAdminServicesUseCase';
import { TypeOrmServiceRepository } from '@/modules/catalog/infra/database/typeorm/repositories/TypeOrmServiceRepository';
import { ListAdminServicesController } from '@/modules/catalog/presentation/controllers/ListAdminServicesController';
import { buildCatalogRoutes } from '@/modules/catalog/presentation/routes/catalog.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';

import { Router } from 'express';

export function makeCatalogModule(): Router {
  const serviceRepository = new TypeOrmServiceRepository(AppDataSource);
  const userRepository = new TypeOrmUserRepository(AppDataSource);

  return buildCatalogRoutes(
    { listAdminServices: new ListAdminServicesController(new ListAdminServicesUseCase(serviceRepository)) },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
