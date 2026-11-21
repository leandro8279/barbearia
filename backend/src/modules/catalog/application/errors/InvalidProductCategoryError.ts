import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class InvalidProductCategoryError extends AppError {
  constructor() {
    super('Selecione uma categoria válida.', HttpStatus.UNPROCESSABLE_ENTITY, 'INVALID_PRODUCT_CATEGORY');
  }
}
