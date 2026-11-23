import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class CpfAlreadyExistsError extends AppError {
  constructor() {
    super('Este CPF já está cadastrado', HttpStatus.CONFLICT, 'CPF_ALREADY_EXISTS');
  }
}
