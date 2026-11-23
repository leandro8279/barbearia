import { logger } from '@/config';
import { AppDataSource } from '@/config/database';

import {
  CreateAdminCustomerUseCase,
  FindCustomerDuplicatesUseCase,
  GetAdminCustomerProfileUseCase,
  ListAdminCustomersUseCase,
  UpdateAdminCustomerUseCase,
} from '@/modules/customers/application/use-cases/';
import {
  TypeOrmCustomerAppointmentRepository,
  TypeOrmCustomerNoteRepository,
  TypeOrmCustomerRepository,
  TypeOrmCustomerTabRepository,
} from '@/modules/customers/infra/repositories';
import {
  CreateAdminCustomerController,
  FindCustomerDuplicatesController,
  GetAdminCustomerProfileController,
  ListAdminCustomersController,
  UpdateAdminCustomerController,
} from '@/modules/customers/presentation/controllers';
import { buildCustomersRoutes } from '@/modules/customers/presentation/routes/customers.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';
import { TypeOrmAuditLogger } from '@/shared/providers/audit/TypeOrmAuditLogger';

import { Router } from 'express';

export function makeCustomersModule(): Router {
  const customerRepository = new TypeOrmCustomerRepository(AppDataSource);
  const userRepository = new TypeOrmUserRepository(AppDataSource);

  const appointmentRepository = new TypeOrmCustomerAppointmentRepository(AppDataSource);
  const tabRepository = new TypeOrmCustomerTabRepository(AppDataSource);
  const noteRepository = new TypeOrmCustomerNoteRepository(AppDataSource);
  const auditLogger = new TypeOrmAuditLogger(AppDataSource, logger);

  return buildCustomersRoutes(
    {
      listAdminCustomers: new ListAdminCustomersController(new ListAdminCustomersUseCase(customerRepository)),
      findDuplicates: new FindCustomerDuplicatesController(new FindCustomerDuplicatesUseCase(customerRepository)),
      getAdminCustomerProfile: new GetAdminCustomerProfileController(
        new GetAdminCustomerProfileUseCase(userRepository, appointmentRepository, tabRepository, noteRepository),
      ),
      createAdminCustomer: new CreateAdminCustomerController(new CreateAdminCustomerUseCase(userRepository, customerRepository, auditLogger)),
      updateAdminCustomer: new UpdateAdminCustomerController(new UpdateAdminCustomerUseCase(userRepository, customerRepository, auditLogger)),
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
