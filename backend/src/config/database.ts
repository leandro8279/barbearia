import { logger } from '@/config/logger';

import { AppDataSource } from '@/shared/database/data-source';

export async function connectDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) return;

  await AppDataSource.initialize();
  const executed = await AppDataSource.runMigrations();

  logger.info({ migrations: executed.map((m) => m.name) }, 'SQLite conectado');
}

export async function disconnectDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('SQLite desconectado');
  }
}

export { AppDataSource };
