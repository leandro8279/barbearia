import { AppDataSource } from '@/config/database';
import { logger } from '@/config/logger';

import { CreateServiceUseCase } from '@/modules/catalog/application/use-cases/CreateServiceUseCase';
import { GetAdminProductUseCase } from '@/modules/catalog/application/use-cases/GetAdminProductUseCase';
import { GetAdminServiceUseCase } from '@/modules/catalog/application/use-cases/GetAdminServiceUseCase';
import { ListAdminProductsUseCase } from '@/modules/catalog/application/use-cases/ListAdminProductsUseCase';
import { ListAdminServicesUseCase } from '@/modules/catalog/application/use-cases/ListAdminServicesUseCase';
import { SetServiceActiveUseCase } from '@/modules/catalog/application/use-cases/SetServiceActiveUseCase';
import { TypeOrmBarberRepository } from '@/modules/catalog/infra/repositories/TypeOrmBarberRepository';
import { TypeOrmProductRepository } from '@/modules/catalog/infra/repositories/TypeOrmProductRepository';
import { TypeOrmServiceCategoryRepository } from '@/modules/catalog/infra/repositories/TypeOrmServiceCategoryRepository';
import { TypeOrmServiceRepository } from '@/modules/catalog/infra/repositories/TypeOrmServiceRepository';
import { CreateServiceController } from '@/modules/catalog/presentation/controllers/CreateServiceController';
import { GetAdminProductController } from '@/modules/catalog/presentation/controllers/GetAdminProductController';
import { GetAdminServiceController } from '@/modules/catalog/presentation/controllers/GetAdminServiceController';
import { ListAdminProductsController } from '@/modules/catalog/presentation/controllers/ListAdminProductsController';
import { ListAdminServicesController } from '@/modules/catalog/presentation/controllers/ListAdminServicesController';
import { SetServiceActiveController } from '@/modules/catalog/presentation/controllers/SetServiceActiveController';
import { buildCatalogRoutes } from '@/modules/catalog/presentation/routes/catalog.routes';
import { TypeOrmUserRepository } from '@/modules/users';
import { AdjustProductStockUseCase } from '@/modules/catalog/application/use-cases/AdjustProductStockUseCase';
import { AdjustProductStockController } from '@/modules/catalog/presentation/controllers/AdjustProductStockController';
import { CreateProductUseCase } from '@/modules/catalog/application/use-cases/CreateProductUseCase';
import { TypeOrmProductCategoryRepository } from '@/modules/catalog/infra/repositories/TypeOrmProductCategoryRepository';
import { CreateProductController } from '@/modules/catalog/presentation/controllers/CreateProductController';

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
    },
    makeAuthMiddleware(tokenProvider, userRepository),
  );
}
