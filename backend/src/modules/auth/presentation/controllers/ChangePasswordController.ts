import { ChangePasswordDTO } from '@/modules/auth/application/dtos/ChangePasswordDTO';
import { ChangePasswordOutput } from '@/modules/auth/application/use-cases/ChangePasswordUseCase';
import { changePasswordBodySchema } from '@/modules/auth/presentation/validators/change-password.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ChangePasswordController implements IController {
  constructor(private readonly changePasswordUseCase: IUseCase<ChangePasswordDTO, ChangePasswordOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { currentPassword, password } = changePasswordBodySchema.parse(request.body);

    const result = await this.changePasswordUseCase.execute({ userId: request.user.id, currentPassword, password });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
