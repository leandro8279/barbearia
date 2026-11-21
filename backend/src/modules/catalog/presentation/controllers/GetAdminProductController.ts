import { GetAdminProductDTO } from '@/modules/catalog/application/dtos/GetAdminProductDTO';
import { GetAdminProductOutput } from '@/modules/catalog/application/use-cases/GetAdminProductUseCase';
import { getAdminProductParamsSchema } from '@/modules/catalog/presentation/validators/getAdminProduct.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GetAdminProductController implements IController {
  constructor(private readonly getAdminProductUseCase: IUseCase<GetAdminProductDTO, GetAdminProductOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const { id } = getAdminProductParamsSchema.parse(request.params ?? {});

    const result = await this.getAdminProductUseCase.execute({ id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
