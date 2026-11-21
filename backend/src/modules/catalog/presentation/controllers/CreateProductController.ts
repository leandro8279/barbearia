import { CreateProductDTO } from '@/modules/catalog/application/dtos/CreateProductDTO';
import { CreateProductOutput } from '@/modules/catalog/application/use-cases/CreateProductUseCase';
import { createProductBodySchema } from '@/modules/catalog/presentation/validators/createProduct.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class CreateProductController implements IController {
  constructor(private readonly createProductUseCase: IUseCase<CreateProductDTO, CreateProductOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const body = createProductBodySchema.parse(request.body);

    const result = await this.createProductUseCase.execute({ ...body, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.CREATED, body: result.value };
  }
}
