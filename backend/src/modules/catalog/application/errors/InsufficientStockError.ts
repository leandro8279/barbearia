import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class InsufficientStockError extends AppError {
  constructor(available: number) {
    super('O ajuste não pode deixar o estoque negativo.', HttpStatus.CONFLICT, 'INSUFFICIENT_STOCK', { available });
  }
}
