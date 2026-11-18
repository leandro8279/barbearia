import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}
