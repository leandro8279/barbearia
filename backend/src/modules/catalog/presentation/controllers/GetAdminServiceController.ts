import { GetAdminServiceDTO } from '@/modules/catalog/application/dtos/GetAdminServiceDTO';
import { GetAdminServiceOutput } from '@/modules/catalog/application/use-cases/GetAdminServiceUseCase';
import { getAdminServiceParamsSchema } from '@/modules/catalog/presentation/validators/getAdminService.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GetAdminServiceController implements IController {
  constructor(private readonly getAdminServiceUseCase: IUseCase<GetAdminServiceDTO, GetAdminServiceOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const { id } = getAdminServiceParamsSchema.parse(request.params ?? {});

    const result = await this.getAdminServiceUseCase.execute({ id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
