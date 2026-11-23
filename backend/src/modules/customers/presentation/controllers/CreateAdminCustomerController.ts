import { CreateAdminCustomerDTO } from '@/modules/customers/application/dtos/CreateAdminCustomerDTO';
import { CreateAdminCustomerOutput } from '@/modules/customers/application/use-cases/CreateAdminCustomerUseCase';
import { createAdminCustomerBodySchema } from '@/modules/customers/presentation/validators/createAdminCustomer.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class CreateAdminCustomerController implements IController {
  constructor(private readonly createAdminCustomerUseCase: IUseCase<CreateAdminCustomerDTO, CreateAdminCustomerOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const body = createAdminCustomerBodySchema.parse(request.body);

    const result = await this.createAdminCustomerUseCase.execute({ ...body, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.CREATED, body: result.value };
  }
}
