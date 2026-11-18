import bcrypt from 'bcryptjs';

import { IHashProvider } from './HashProviderInterface';

export class BcryptHashProvider implements IHashProvider {
  constructor(private readonly saltRounds = 10) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
