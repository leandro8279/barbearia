import { env } from '@/config/env';
import { logger } from '@/config/logger';

import { AppDataSource } from '@/shared/database/data-source';

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function connectDatabase(): Promise<void> {
  await mkdir(dirname(env.DATABASE_PATH), { recursive: true });

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    logger.info('SQLite conectado');
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('SQLite desconectado');
  }
}

export { AppDataSource };
