import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class ServiceSlugAlreadyExistsError extends AppError {
  constructor() {
    super('Já existe um serviço com este slug', HttpStatus.CONFLICT, 'SERVICE_SLUG_ALREADY_EXISTS');
  }
}
