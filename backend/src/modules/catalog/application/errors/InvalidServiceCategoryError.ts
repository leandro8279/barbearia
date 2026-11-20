import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class InvalidServiceCategoryError extends AppError {
  constructor() {
    super('Selecione uma categoria válida.', HttpStatus.UNPROCESSABLE_ENTITY, 'INVALID_SERVICE_CATEGORY');
  }
}
