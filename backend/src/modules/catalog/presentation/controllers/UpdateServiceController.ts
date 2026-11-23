import { UpdateServiceDTO } from '@/modules/catalog/application/dtos/UpdateServiceDTO';
import { UpdateServiceOutput } from '@/modules/catalog/application/use-cases/UpdateServiceUseCase';
import { getAdminServiceParamsSchema } from '@/modules/catalog/presentation/validators/getAdminService.schema';
import { updateServiceBodySchema } from '@/modules/catalog/presentation/validators/updateService.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class UpdateServiceController implements IController {
  constructor(private readonly updateServiceUseCase: IUseCase<UpdateServiceDTO, UpdateServiceOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { id } = getAdminServiceParamsSchema.parse(request.params ?? {});
    const { barberAssignments, ...body } = updateServiceBodySchema.parse(request.body);

    const result = await this.updateServiceUseCase.execute({
      ...body,
      id,
      barberAssignments: barberAssignments
        .filter(({ assigned }) => assigned)
        .map(({ barberId, commissionPct }) => ({ barberId, commissionPct: commissionPct ?? null })),
      actorId: request.user.id,
    });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
