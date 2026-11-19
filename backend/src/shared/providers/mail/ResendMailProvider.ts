import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

import { Resend } from 'resend';

import { IMailDTO, IMailProvider } from './MailProviderInterface';

export class ResendMailProvider implements IMailProvider {
  private readonly resend: Resend;

  constructor(
    private readonly secret: string,
    private readonly from: string,
  ) {
    this.resend = new Resend(this.secret);
  }

  public async sendMail(data: IMailDTO): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        to: data.to,
        text: data.body,
        html: data.html,
        replyTo: data.replyTo,
        subject: data.subject,
        from: data.from ?? this.from,
        attachments: data.attachments,
      });

      if (error) {
        throw new AppError('Não foi possível enviar o e-mail.', HttpStatus.INTERNAL_SERVER_ERROR, 'MAIL_SEND_ERROR', {
          provider: 'resend',
          message: error.message,
        });
      }
    } catch (error) {
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
