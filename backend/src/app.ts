import '@/config/zod';
import { buildOpenApiDocument } from '@/docs';

import { env } from '@/config/env';
import { logger } from '@/config/logger';

import { registerModules } from '@/modules';

import { NotFoundError } from '@/shared/errors/NotFoundError';
import { errorHandler } from '@/shared/middlewares/ErrorHandler.middleware';
import { rateLimits } from '@/shared/middlewares/RateLimit.middleware';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));
  app.use(rateLimits.global);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Documentação só fora de produção
  if (env.NODE_ENV !== 'production') {
    const document = buildOpenApiDocument(`http://localhost:${env.PORT}`);
    app.get('/docs.json', (_req, res) => {
      res.json(document);
    });
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(document));
  }

  app.use('/api', registerModules());

  app.use((_req, _res, next) => next(new NotFoundError('Rota')));
  app.use(errorHandler); // sempre o último

  return app;
}

export const app = createApp();
