import { TooManyRequestsError } from '@/shared/errors/TooManyRequestsError';
import { InMemoryRateLimiter } from '@/shared/providers/rate-limiter/InMemoryRateLimiter';
import { IRateLimiter } from '@/shared/providers/rate-limiter/RateLimiterInterface';
import { env } from '@/config/env';
import { Request } from 'express';
import { RequestHandler, Response } from 'express';

/**
 * Limita as requisições por IP usando o limiter recebido. Ao estourar o limite,
 * envia `Retry-After` e lança 429 (o error-handler monta a resposta).
 */

function reject(res: Response, retryAfterMs: number, message?: string): never {
  res.setHeader('Retry-After', String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
  throw new TooManyRequestsError(message);
}

const clientKey = (req: Request) => req.ip ?? req.socket?.remoteAddress ?? 'unknown';

export function makeRateLimitMiddleware(limiter: IRateLimiter): RequestHandler {
  return async (req, res, next) => {
    const result = await limiter.consume(clientKey(req));
    if (!result.allowed) reject(res, result.retryAfterMs);
    next();
  };
}

/** Bloqueia sem consumir: quem consome é o use case, só nas falhas. */
export function makeAttemptGuardMiddleware(limiter: IRateLimiter, message?: string): RequestHandler {
  return async (req, res, next) => {
    const result = await limiter.status(clientKey(req));
    if (!result.allowed) reject(res, result.retryAfterMs, message);
    next();
  };
}

const minutes = (n: number) => n * 60 * 1000;
export const loginFailedAttempts = new InMemoryRateLimiter({ windowMs: minutes(10), maxAttempts: 5 });
// Cada preset tem o próprio limiter, então os contadores são independentes por endpoint.
export const rateLimits = {
  /** Proteção geral da API. */
  global: makeRateLimitMiddleware(new InMemoryRateLimiter({ windowMs: minutes(15), maxAttempts: env.RATE_LIMIT_GLOBAL_MAX })),
  /** Rotas públicas sensíveis (login). */
  guest: makeRateLimitMiddleware(new InMemoryRateLimiter({ windowMs: minutes(10), maxAttempts: 10 })),
  /** Cadastro. */
  register: makeRateLimitMiddleware(new InMemoryRateLimiter({ windowMs: minutes(10), maxAttempts: 5 })),
  /** Recuperação de senha. */
  forgot: makeRateLimitMiddleware(new InMemoryRateLimiter({ windowMs: minutes(10), maxAttempts: 5 })),
  /** Redefinição de senha. */
  reset: makeRateLimitMiddleware(new InMemoryRateLimiter({ windowMs: minutes(10), maxAttempts: 5 })),
  /** Login: só tentativas inválidas contam (ver LoginUseCase). */
  login: makeAttemptGuardMiddleware(loginFailedAttempts, 'Muitas tentativas inválidas. Aguarde antes de tentar novamente.'),
  /** Troca de senha (usuário autenticado). */
  changePassword: makeRateLimitMiddleware(new InMemoryRateLimiter({ windowMs: minutes(10), maxAttempts: 5 })),
};
