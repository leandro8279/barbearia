import 'reflect-metadata';
import { app } from '@/app';

import { connectDatabase, disconnectDatabase } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/config/logger';


async function bootstrap() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Servidor rodando em http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} recebido, encerrando...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // força saída se algo travar
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Falha ao iniciar a aplicação');
  process.exit(1);
});
