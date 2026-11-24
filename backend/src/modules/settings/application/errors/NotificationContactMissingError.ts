import type { NotificationChannel } from '@/modules/settings/domain/entities/Notification';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class NotificationContactMissingError extends AppError {
  constructor(channel: NotificationChannel) {
    super(
      channel === 'whatsapp' ? 'O cliente não tem telefone cadastrado para WhatsApp.' : 'O cliente não tem e-mail cadastrado.',
      HttpStatus.BAD_REQUEST,
      'NOTIFICATION_CONTACT_MISSING',
    );
  }
}
