import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class NotificationNotReadyError extends AppError {
  constructor() {
    super('Somente mensagens prontas podem ser registradas como enviadas.', HttpStatus.CONFLICT, 'NOTIFICATION_NOT_READY');
  }
}
