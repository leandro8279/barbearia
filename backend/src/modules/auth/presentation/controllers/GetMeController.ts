import { GetMeDTO } from '@/modules/auth/application/dtos/GetMeDTO';
import { GetMeOutput } from '@/modules/auth/application/use-cases/GetMeUseCase';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GetMeController implements IController {
  constructor(private readonly getMeUseCase: IUseCase<GetMeDTO, GetMeOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const result = await this.getMeUseCase.execute({ id: request.user.id, tokenVersion: request.user.tokenVersion });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
