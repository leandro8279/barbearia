import { hasPermission } from '@/shared/auth/hasPermission';
import { ForbiddenError } from '@/shared/errors/ForbiddenError';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';

import { RequestHandler } from 'express';

/** Use sempre DEPOIS do middleware de autenticação. */
export function requirePermission(permission: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw new UnauthorizedError('Token não informado');
    if (!hasPermission(req.user, permission)) throw new ForbiddenError();

    next();
  };
}
