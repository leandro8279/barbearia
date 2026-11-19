import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class GuestPhoneRegisteredError extends AppError {
  constructor() {
    super('Este telefone pertence a uma conta. Entre para continuar.', HttpStatus.CONFLICT, 'PHONE_BELONGS_TO_ACCOUNT');
  }
}
