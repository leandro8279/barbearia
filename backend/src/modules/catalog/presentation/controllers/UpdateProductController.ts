import { UpdateProductDTO } from '@/modules/catalog/application/dtos/UpdateProductDTO';
import { UpdateProductOutput } from '@/modules/catalog/application/use-cases/UpdateProductUseCase';
import { getAdminProductParamsSchema } from '@/modules/catalog/presentation/validators/getAdminProduct.schema';
import { updateProductBodySchema } from '@/modules/catalog/presentation/validators/updateProduct.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class UpdateProductController implements IController {
  constructor(private readonly updateProductUseCase: IUseCase<UpdateProductDTO, UpdateProductOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { id } = getAdminProductParamsSchema.parse(request.params ?? {});
    const body = updateProductBodySchema.parse(request.body);

    const result = await this.updateProductUseCase.execute({ ...body, id, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
