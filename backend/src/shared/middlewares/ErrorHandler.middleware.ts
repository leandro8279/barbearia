import { logger } from '@/config/logger';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

import { ErrorRequestHandler } from 'express';
import { ZodError, z } from 'zod';

const BODY_PARSER_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  'entity.too.large': { status: HttpStatus.PAYLOAD_TOO_LARGE, code: 'PAYLOAD_TOO_LARGE', message: 'Corpo da requisição grande demais' },
  'entity.parse.failed': { status: HttpStatus.BAD_REQUEST, code: 'INVALID_JSON', message: 'JSON inválido' },
};

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

  const bodyError = BODY_PARSER_ERRORS[(err as { type?: string }).type ?? ''];
  if (bodyError) {
    res.status(bodyError.status).json({ error: { code: bodyError.code, message: bodyError.message } });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Erro não tratado');
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
  });
};
