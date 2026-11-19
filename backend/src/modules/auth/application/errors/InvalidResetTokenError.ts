import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class InvalidResetTokenError extends AppError {
  constructor() {
    super('Token de recuperação inválido ou expirado', HttpStatus.BAD_REQUEST, 'INVALID_RESET_TOKEN');
  }
}
