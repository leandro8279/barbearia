import { logger } from '@/config/logger';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

// import { registerModules } from './modules';
// import { NotFoundError } from './shared/errors/not-found.error';
// import { errorHandler } from './shared/middlewares/error-handler.middleware';
// import { rateLimiter } from './shared/middlewares/rate-limit.middleware';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));
  // app.use(rateLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // app.use('/api', registerModules());

  // app.use((_req, _res, next) => next(new NotFoundError('Rota')));
  // app.use(errorHandler); // sempre o último

  return app;
}

export const app = createApp();
