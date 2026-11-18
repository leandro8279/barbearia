import { env } from '@/config/env';

import { UserEntity } from '@/modules/users/infra/database/typeorm/entities/UserEntity';

import 'reflect-metadata';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: env.DATABASE_PATH,

  entities: [UserEntity],

  migrations: ['src/shared/database/migrations/*{.ts,.js}'],

  synchronize: false,

  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],

  enableWAL: true,
  timeout: 5000,
});
