import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class TooManyRequestsError extends AppError {
  constructor(message = 'Muitas solicitações. Aguarde antes de tentar novamente.') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS');
  }
}
