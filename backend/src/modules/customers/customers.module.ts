import { AppDataSource } from '@/config/database';

import { ListAdminCustomersUseCase } from '@/modules/customers/application/use-cases/';
import { TypeOrmCustomerRepository } from '@/modules/customers/infra/repositories/';
import { ListAdminCustomersController } from '@/modules/customers/presentation/controllers';
import { buildCustomersRoutes } from '@/modules/customers/presentation/routes/customers.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';

import { Router } from 'express';

export function makeCustomersModule(): Router {
  const customerRepository = new TypeOrmCustomerRepository(AppDataSource);
  const userRepository = new TypeOrmUserRepository(AppDataSource);

  return buildCustomersRoutes(
    { listAdminCustomers: new ListAdminCustomersController(new ListAdminCustomersUseCase(customerRepository)) },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
