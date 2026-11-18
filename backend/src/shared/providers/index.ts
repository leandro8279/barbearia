import { env } from '@/config/env';

import { BcryptHashProvider } from '@/shared/providers/hash/BcryptHashProvider';
import { JwtTokenProvider } from '@/shared/providers/token/JwtTokenProvider';

export const hashProvider = new BcryptHashProvider();
export const tokenProvider = new JwtTokenProvider(env.JWT_SECRET, env.JWT_EXPIRES_IN);
