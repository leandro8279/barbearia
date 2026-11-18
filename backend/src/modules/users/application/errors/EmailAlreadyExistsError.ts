import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class EmailAlreadyExistsError extends AppError {
  constructor() {
    super('E-mail já cadastrado', HttpStatus.CONFLICT, 'EMAIL_ALREADY_EXISTS');
  }
}
