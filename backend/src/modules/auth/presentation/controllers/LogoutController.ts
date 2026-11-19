import { LogoutDTO } from '@/modules/auth/application/dtos/LogoutDTO';
import { LogoutOutput } from '@/modules/auth/application/use-cases/LogoutUseCase';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class LogoutController implements IController {
  constructor(private readonly logoutUseCase: IUseCase<LogoutDTO, LogoutOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const result = await this.logoutUseCase.execute({ userId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.NO_CONTENT, body: undefined };
  }
}
