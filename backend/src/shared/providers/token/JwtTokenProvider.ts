import { ITokenPayload } from '@/shared/interfaces/HttpInterface';

import jwt, { SignOptions } from 'jsonwebtoken';

import { ITokenProvider } from './TokenProviderInterface';

export class JwtTokenProvider implements ITokenProvider {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign({ id }: ITokenPayload): string {
    return jwt.sign({}, this.secret, {
      subject: id,
      algorithm: 'HS256',
      expiresIn: this.expiresIn as SignOptions['expiresIn'],
    });
  }

  verify(token: string): ITokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret, { algorithms: ['HS256'] });
      if (typeof decoded === 'string' || !decoded.sub) return null;
      return { id: decoded.sub };
    } catch {
      return null;
    }
  }
}
