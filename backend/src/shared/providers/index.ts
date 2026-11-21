import { logger } from '@/config/logger';
import { env } from '@/config/env';

import { BcryptHashProvider } from '@/shared/providers/hash/BcryptHashProvider';
import { ConsoleMailProvider } from '@/shared/providers/mail/ConsoleMailProvider';
import { IMailProvider } from '@/shared/providers/mail/MailProviderInterface';
import { ResendMailProvider } from '@/shared/providers/mail/ResendMailProvider';
import { JwtTokenProvider } from '@/shared/providers/token/JwtTokenProvider';

export const hashProvider = new BcryptHashProvider();
export const tokenProvider = new JwtTokenProvider(env.JWT_SECRET, env.JWT_EXPIRES_IN);
export const mailProvider: IMailProvider =
  env.NODE_ENV === 'production'
    ? new ResendMailProvider(String(env.RESEND_API_KEY), String(env.RESEND_FROM_EMAIL), logger)
    : new ConsoleMailProvider(logger);
