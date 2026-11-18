import { logger } from '@/config/logger';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

import { ErrorRequestHandler } from 'express';
import { ZodError, z } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
      error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: z.flattenError(err).fieldErrors },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Erro não tratado');
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
  });
};
