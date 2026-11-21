import { AdjustProductStockDTO } from '@/modules/catalog/application/dtos/AdjustProductStockDTO';
import { AdjustProductStockOutput } from '@/modules/catalog/application/use-cases/AdjustProductStockUseCase';
import { adjustProductStockBodySchema } from '@/modules/catalog/presentation/validators/adjustProductStock.schema';
import { getAdminProductParamsSchema } from '@/modules/catalog/presentation/validators/getAdminProduct.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class AdjustProductStockController implements IController {
  constructor(private readonly adjustProductStockUseCase: IUseCase<AdjustProductStockDTO, AdjustProductStockOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { id } = getAdminProductParamsSchema.parse(request.params ?? {});
    const { delta, reason } = adjustProductStockBodySchema.parse(request.body);

    const result = await this.adjustProductStockUseCase.execute({ id, delta, reason, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
