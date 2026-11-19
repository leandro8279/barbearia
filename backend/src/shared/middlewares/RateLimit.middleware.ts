import { TooManyRequestsError } from '@/shared/errors/TooManyRequestsError';
import { InMemoryRateLimiter } from '@/shared/providers/rate-limiter/InMemoryRateLimiter';
import { IRateLimiter } from '@/shared/providers/rate-limiter/RateLimiterInterface';

import { RequestHandler } from 'express';

/**
 * Limita as requisições por IP usando o limiter recebido. Ao estourar o limite,
 * envia `Retry-After` e lança 429 (o error-handler monta a resposta).
 */
export function makeRateLimitMiddleware(limiter: IRateLimiter): RequestHandler {
  return async (req, res, next) => {
    const key = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const result = await limiter.consume(key);

    if (result.allowed) {
      next();
      return;
    }

    res.setHeader('Retry-After', String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))));
    throw new TooManyRequestsError();
  };
}

const minutes = (n: number) => n * 60 * 1000;

// Cada preset tem o próprio limiter, então os contadores são independentes por endpoint.
export const rateLimits = {
  /** Proteção geral da API. */
  global: makeRateLimitMiddleware(new InMemoryRateLimiter({ windowMs: minutes(15), maxAttempts: 100 })),
  /** Rotas públicas sensíveis (login). */
  guest: makeRateLimitMiddleware(new InMemoryRateLimiter({ windowMs: minutes(10), maxAttempts: 10 })),
  /** Cadastro. */
  register: makeRateLimitMiddleware(new InMemoryRateLimiter({ windowMs: minutes(10), maxAttempts: 5 })),
  /** Recuperação de senha. */
  forgot: makeRateLimitMiddleware(new InMemoryRateLimiter({ windowMs: minutes(10), maxAttempts: 5 })),
};
