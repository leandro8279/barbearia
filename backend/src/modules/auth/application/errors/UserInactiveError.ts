import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class UserInactiveError extends AppError {
  constructor() {
    super('Usuário inativo ou bloqueado', HttpStatus.FORBIDDEN, 'USER_INACTIVE');
  }
}
