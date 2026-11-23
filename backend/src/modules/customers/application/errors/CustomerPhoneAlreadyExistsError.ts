import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class CustomerPhoneAlreadyExistsError extends AppError {
  constructor(duplicate: { id: string; name: string } | null = null) {
    super(
      'Este telefone já está cadastrado para outro cliente.',
      HttpStatus.CONFLICT,
      'CUSTOMER_PHONE_ALREADY_EXISTS',
      duplicate ? { duplicate: { id: duplicate.id, name: duplicate.name } } : undefined,
    );
  }
}
