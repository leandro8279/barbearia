import type { ITokenPayload } from '@/shared/interfaces/HttpInterface';

declare global {
  namespace Express {
    interface Request {
      user?: ITokenPayload;
    }
  }
}

export {};
