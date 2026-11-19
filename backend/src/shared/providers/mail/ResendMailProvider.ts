import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

import { Logger } from 'pino';
import { Resend } from 'resend';

import { IMailProvider, MailMessage } from './MailProviderInterface';

export class ResendMailProvider implements IMailProvider {
  private readonly resend: Resend;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly logger: Logger,
  ) {
    this.resend = new Resend(this.apiKey);
  }

  public async send({ html, subject, text, to }: MailMessage): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({ from: this.from, to: [to], subject, html, text });

      if (error) {
        throw new AppError('Não foi possível enviar o e-mail.', HttpStatus.INTERNAL_SERVER_ERROR, 'MAIL_SEND_ERROR', {
          provider: 'resend',
          message: error.message,
        });
      }
    } catch (error) {
      this.logger.error({ error, subject }, 'Falha ao enviar e-mail');

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('O serviço de e-mail está indisponível.', HttpStatus.INTERNAL_SERVER_ERROR, 'MAIL_PROVIDER_ERROR', {
        provider: 'resend',
        cause: error instanceof Error ? error.message : error,
      });
    }
  }
}
