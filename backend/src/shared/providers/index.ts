import { env } from '@/config/env';

import { BcryptHashProvider } from '@/shared/providers/hash/BcryptHashProvider';
import { ResendMailProvider } from '@/shared/providers/mail/ResendMailProvider';
import { JwtTokenProvider } from '@/shared/providers/token/JwtTokenProvider';

export const hashProvider = new BcryptHashProvider();
export const mailProvider = new ResendMailProvider(env.MAIL_API_KEY, env.MAIL_FROM);
export const tokenProvider = new JwtTokenProvider(env.JWT_SECRET, env.JWT_EXPIRES_IN);
