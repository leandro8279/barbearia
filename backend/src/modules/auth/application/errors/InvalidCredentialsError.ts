import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('E-mail ou senha inválidos', HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }
}
