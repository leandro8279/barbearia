import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class InvalidBarberAssignmentError extends AppError {
  constructor() {
    super('Um profissional selecionado não está disponível.', HttpStatus.UNPROCESSABLE_ENTITY, 'INVALID_BARBER_ASSIGNMENT');
  }
}
