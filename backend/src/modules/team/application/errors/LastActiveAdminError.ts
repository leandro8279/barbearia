import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class LastActiveAdminError extends AppError {
  constructor() {
    super('Não é possível remover ou desativar o último administrador ativo.', HttpStatus.CONFLICT, 'LAST_ACTIVE_ADMIN');
  }
}
