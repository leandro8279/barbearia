import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class InvalidCurrentPasswordError extends AppError {
  constructor() {
    super('Senha atual incorreta', HttpStatus.BAD_REQUEST, 'INVALID_CURRENT_PASSWORD');
  }
}
