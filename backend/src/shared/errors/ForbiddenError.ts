import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class ForbiddenError extends AppError {
  constructor(message = 'Você não tem permissão para esta ação') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}
