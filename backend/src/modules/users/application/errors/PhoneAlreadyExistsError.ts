import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class PhoneAlreadyExistsError extends AppError {
  constructor() {
    super('Este telefone já está cadastrado', HttpStatus.CONFLICT, 'PHONE_ALREADY_EXISTS');
  }
}
