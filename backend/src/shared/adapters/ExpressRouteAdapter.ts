import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest } from '@/shared/interfaces/HttpInterface';

import { RequestHandler } from 'express';

export const ExpressControllerAdapter =
  (controller: IController): RequestHandler =>
  async (req, res, next) => {
    try {
      const httpRequest: IRequest = {
        body: req.body,
        params: req.params as Record<string, string>,
        query: req.query,
        ip: req.ip ?? req.socket?.remoteAddress,
        files: (req as { files?: unknown }).files,
        headers: req.headers,
        user: req.user,
      };

      const { statusCode, body } = await controller.handle(httpRequest);

      if (statusCode === HttpStatus.NO_CONTENT) {
        res.status(statusCode).send();
        return;
      }

      if (statusCode >= 200 && statusCode <= 299) {
        res.status(statusCode).json(body);
        return;
      }

      // Erro esperado devolvido como valor (Either.Left → failure())
      const { message, code, details } = (body ?? {}) as { message?: string; code?: string; details?: unknown };
      res.status(statusCode).json({ error: { code, message, details } });
    } catch (err) {
      next(err);
    }
  };
