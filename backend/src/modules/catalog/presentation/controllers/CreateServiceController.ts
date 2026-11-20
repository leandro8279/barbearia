import { CreateServiceDTO } from '@/modules/catalog/application/dtos/CreateServiceDTO';
import { CreateServiceOutput } from '@/modules/catalog/application/use-cases/CreateServiceUseCase';
import { createServiceBodySchema } from '@/modules/catalog/presentation/validators/createService.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class CreateServiceController implements IController {
  constructor(private readonly createServiceUseCase: IUseCase<CreateServiceDTO, CreateServiceOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { barberAssignments, ...body } = createServiceBodySchema.parse(request.body);

    const result = await this.createServiceUseCase.execute({
      ...body,
      barberAssignments: barberAssignments
        .filter(({ assigned }) => assigned)
        .map(({ barberId, commissionPct }) => ({ barberId, commissionPct: commissionPct ?? null })),
      actorId: request.user.id,
    });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.CREATED, body: result.value };
  }
}
