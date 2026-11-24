import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class NotificationNotDeliverableError extends AppError {
  constructor() {
    super('O cliente não pode receber esta mensagem pelo canal selecionado.', HttpStatus.CONFLICT, 'NOTIFICATION_NOT_DELIVERABLE');
  }
}
