import { AppDataSource } from '@/config/database';
import { logger } from '@/config/logger';

import {
  AdjustProductStockUseCase,
  CreateProductUseCase,
  CreateServiceUseCase,
  GetAdminProductUseCase,
  GetAdminServiceUseCase,
  ListAdminBarbersUseCase,
  ListAdminProductsUseCase,
  ListAdminServicesUseCase,
  SetServiceActiveUseCase,
  UpdateProductUseCase,
  UpdateServiceUseCase,
} from '@/modules/catalog/application/use-cases';
import {
  TypeOrmBarberRepository,
  TypeOrmProductCategoryRepository,
  TypeOrmProductRepository,
  TypeOrmServiceCategoryRepository,
  TypeOrmServiceRepository,
} from '@/modules/catalog/infra/repositories';
import {
  AdjustProductStockController,
  CreateProductController,
  CreateServiceController,
  GetAdminProductController,
  GetAdminServiceController,
  ListAdminBarbersController,
  ListAdminProductsController,
  ListAdminServicesController,
  SetServiceActiveController,
  UpdateProductController,
  UpdateServiceController,
} from '@/modules/catalog/presentation/controllers';
import { buildCatalogRoutes } from '@/modules/catalog/presentation/routes/catalog.routes';
import { TypeOrmUserRepository } from '@/modules/users';

import { makeAuthMiddleware } from '@/shared/middlewares/Auth.middleware';
import { tokenProvider } from '@/shared/providers';
import { TypeOrmAuditLogger } from '@/shared/providers/audit/TypeOrmAuditLogger';

import { Router } from 'express';

export function makeCatalogModule(): Router {
  const serviceRepository = new TypeOrmServiceRepository(AppDataSource);
  const barberRepository = new TypeOrmBarberRepository(AppDataSource);
  const userRepository = new TypeOrmUserRepository(AppDataSource);
  const auditLogger = new TypeOrmAuditLogger(AppDataSource, logger);
  const categoryRepository = new TypeOrmServiceCategoryRepository(AppDataSource);
  const productRepository = new TypeOrmProductRepository(AppDataSource);
  const productCategoryRepository = new TypeOrmProductCategoryRepository(AppDataSource);

  return buildCatalogRoutes(
    {
      listAdminServices: new ListAdminServicesController(new ListAdminServicesUseCase(serviceRepository)),
      getAdminService: new GetAdminServiceController(new GetAdminServiceUseCase(serviceRepository, barberRepository)),
      setServiceActive: new SetServiceActiveController(new SetServiceActiveUseCase(serviceRepository, auditLogger)),
      createService: new CreateServiceController(new CreateServiceUseCase(serviceRepository, categoryRepository, barberRepository, auditLogger)),
      listAdminProducts: new ListAdminProductsController(new ListAdminProductsUseCase(productRepository)),
      getAdminProduct: new GetAdminProductController(new GetAdminProductUseCase(productRepository)),
      adjustProductStock: new AdjustProductStockController(new AdjustProductStockUseCase(productRepository, auditLogger)),
      createProduct: new CreateProductController(new CreateProductUseCase(productRepository, productCategoryRepository, auditLogger)),
      updateProduct: new UpdateProductController(new UpdateProductUseCase(productRepository, productCategoryRepository, auditLogger)),
      updateService: new UpdateServiceController(new UpdateServiceUseCase(serviceRepository, categoryRepository, barberRepository, auditLogger)),
      listAdminBarbers: new ListAdminBarbersController(new ListAdminBarbersUseCase(barberRepository)),
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
