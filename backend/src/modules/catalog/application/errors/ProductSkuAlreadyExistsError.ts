import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class ProductSkuAlreadyExistsError extends AppError {
  constructor() {
    super('Este SKU já está em uso', HttpStatus.CONFLICT, 'PRODUCT_SKU_ALREADY_EXISTS');
  }
}
