import { env } from '@/config/env';

import { PasswordResetEntity } from '@/modules/auth/infra/database/typeorm/entities/PasswordResetEntity';
import { UserEntity } from '@/modules/users/infra/database/typeorm/entities/UserEntity';
import { ServiceEntity } from '@/modules/catalog/infra/database/typeorm/entities/ServiceEntity';
import { AuditLogEntity } from '@/shared/database/entities/AuditLogEntity';
import { ServiceCategoryEntity } from '@/modules/catalog/infra/database/typeorm/entities/ServiceCategoryEntity';

import 'reflect-metadata';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: env.DATABASE_PATH,

  entities: [UserEntity, AuditLogEntity, PasswordResetEntity, ServiceEntity, ServiceCategoryEntity],
  migrations: ['src/shared/database/migrations/*{.ts,.js}'],

  synchronize: true,

  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],

  enableWAL: true,
  timeout: 5000,
});
