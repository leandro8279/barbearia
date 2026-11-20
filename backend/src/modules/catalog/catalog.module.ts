import { AppDataSource } from '@/config/database';

import { GetAdminServiceUseCase } from '@/modules/catalog/application/use-cases/GetAdminServiceUseCase';
import { ListAdminServicesUseCase } from '@/modules/catalog/application/use-cases/ListAdminServicesUseCase';
import { TypeOrmBarberRepository } from '@/modules/catalog/infra/database/typeorm/repositories/TypeOrmBarberRepository';
import { TypeOrmServiceRepository } from '@/modules/catalog/infra/database/typeorm/repositories/TypeOrmServiceRepository';
import { GetAdminServiceController } from '@/modules/catalog/presentation/controllers/GetAdminServiceController';
import { ListAdminServicesController } from '@/modules/catalog/presentation/controllers/ListAdminServicesController';
import { buildCatalogRoutes } from '@/modules/catalog/presentation/routes/catalog.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';

import { Router } from 'express';

export function makeCatalogModule(): Router {
  const serviceRepository = new TypeOrmServiceRepository(AppDataSource);
  const barberRepository = new TypeOrmBarberRepository(AppDataSource);
  const userRepository = new TypeOrmUserRepository(AppDataSource);

  return buildCatalogRoutes(
    {
      listAdminServices: new ListAdminServicesController(new ListAdminServicesUseCase(serviceRepository)),
      getAdminService: new GetAdminServiceController(new GetAdminServiceUseCase(serviceRepository, barberRepository)),
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
