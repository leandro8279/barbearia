import { UpdateAdminCustomerDTO } from '@/modules/customers/application/dtos/UpdateAdminCustomerDTO';
import { UpdateAdminCustomerOutput } from '@/modules/customers/application/use-cases/UpdateAdminCustomerUseCase';
import { getAdminCustomerProfileParamsSchema } from '@/modules/customers/presentation/validators/getAdminCustomerProfile.schema';
import { updateAdminCustomerBodySchema } from '@/modules/customers/presentation/validators/updateAdminCustomer.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class UpdateAdminCustomerController implements IController {
  constructor(private readonly updateAdminCustomerUseCase: IUseCase<UpdateAdminCustomerDTO, UpdateAdminCustomerOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { id } = getAdminCustomerProfileParamsSchema.parse(request.params ?? {});
    const body = updateAdminCustomerBodySchema.parse(request.body);

    const result = await this.updateAdminCustomerUseCase.execute({ ...body, id, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
