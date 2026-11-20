import { env } from '@/config/env';

import path from 'node:path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: env.DATABASE_PATH,

  entities: [path.join(__dirname, '../../modules/**/*Entity{.ts,.js}'), path.join(__dirname, 'entities/**/*Entity{.ts,.js}')],

  migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],

  synchronize: true,

  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],

  enableWAL: true,
  timeout: 5000,
});
