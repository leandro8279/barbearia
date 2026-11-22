import { AppDataSource } from '@/config/database';

import {
    FindCustomerDuplicatesUseCase, GetAdminCustomerProfileUseCase, ListAdminCustomersUseCase
} from '@/modules/customers/application/use-cases/';
import {
    TypeOrmCustomerAppointmentRepository, TypeOrmCustomerHistoryRepository,
    TypeOrmCustomerNoteRepository, TypeOrmCustomerRepository, TypeOrmCustomerTabRepository
} from '@/modules/customers/infra/repositories/';
import {
    FindCustomerDuplicatesController, GetAdminCustomerProfileController,
    ListAdminCustomersController
} from '@/modules/customers/presentation/controllers';
import { buildCustomersRoutes } from '@/modules/customers/presentation/routes/customers.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';

import { Router } from 'express';

export function makeCustomersModule(): Router {
  const customerRepository = new TypeOrmCustomerRepository(AppDataSource);
  const userRepository = new TypeOrmUserRepository(AppDataSource);
  const historyRepository = new TypeOrmCustomerHistoryRepository(AppDataSource);

  const appointmentRepository = new TypeOrmCustomerAppointmentRepository(AppDataSource);
  const tabRepository = new TypeOrmCustomerTabRepository(AppDataSource);
  const noteRepository = new TypeOrmCustomerNoteRepository(AppDataSource);

  return buildCustomersRoutes(
    {
      listAdminCustomers: new ListAdminCustomersController(new ListAdminCustomersUseCase(customerRepository)),
      findDuplicates: new FindCustomerDuplicatesController(new FindCustomerDuplicatesUseCase(customerRepository)),
      getAdminCustomerProfile: new GetAdminCustomerProfileController(
        new GetAdminCustomerProfileUseCase(userRepository, appointmentRepository, tabRepository, noteRepository),
      ),
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
