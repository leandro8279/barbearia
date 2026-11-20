
import 'reflect-metadata';

import path from 'node:path';
import { DataSource } from 'typeorm';

import { env } from '@/config/env';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: env.DATABASE_PATH,

  entities: [
    path.join(__dirname, '../../modules/**/*.entity.{ts,js}'),
    path.join(__dirname, 'entities/**/*.entity.{ts,js}'),
  ],

  migrations: [
    path.join(__dirname, 'migrations/*.{ts,js}'),
  ],

  synchronize: true,

  logging: env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],

  enableWAL: true,
  timeout: 5000,
});
