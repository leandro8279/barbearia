import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { ITokenProvider } from '@/shared/providers/token/TokenProviderInterface';

import { RequestHandler } from 'express';

export function makeAuthMiddleware(tokenProvider: ITokenProvider): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token não informado');
    }

    const payload = tokenProvider.verify(header.slice(7));
    if (!payload) throw new UnauthorizedError('Token inválido ou expirado');

    req.user = payload;
    next();
  };
}
