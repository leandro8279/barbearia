import { IUserRepository } from '@/modules/users';

import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { ITokenProvider } from '@/shared/providers/token/TokenProviderInterface';

import { RequestHandler } from 'express';

export function makeAuthMiddleware(tokenProvider: ITokenProvider, userRepository: Pick<IUserRepository, 'findById'>): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Token não informado');

    const payload = tokenProvider.verify(header.slice(7));
    if (!payload) throw new UnauthorizedError('Token inválido ou expirado');

    const user = await userRepository.findById(payload.id);
    if (!user || !user.active || user.tokenVersion !== (payload.tokenVersion ?? 0)) {
      throw new UnauthorizedError('Token inválido ou expirado');
    }

    req.user = payload;
    next();
  };
}
