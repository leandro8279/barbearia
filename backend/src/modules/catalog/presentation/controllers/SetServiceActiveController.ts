import { SetServiceActiveDTO } from '@/modules/catalog/application/dtos/SetServiceActiveDTO';
import { SetServiceActiveOutput } from '@/modules/catalog/application/use-cases/SetServiceActiveUseCase';
import { getAdminServiceParamsSchema } from '@/modules/catalog/presentation/validators/getAdminService.schema';
import { setServiceActiveBodySchema } from '@/modules/catalog/presentation/validators/setServiceActive.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class SetServiceActiveController implements IController {
  constructor(private readonly setServiceActiveUseCase: IUseCase<SetServiceActiveDTO, SetServiceActiveOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { id } = getAdminServiceParamsSchema.parse(request.params ?? {});
    const { active } = setServiceActiveBodySchema.parse(request.body);

    const result = await this.setServiceActiveUseCase.execute({ id, active, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
