import { IMailProvider, MailMessage } from '@/shared/providers/mail/MailProviderInterface';

import type { Logger } from 'pino';

export class ConsoleMailProvider implements IMailProvider {
  constructor(private readonly logger: Logger) {}

  async send({ to, subject, text }: MailMessage): Promise<void> {
    this.logger.info(`[mail] ${subject} → ${to}: ${text}`);
  }
}
