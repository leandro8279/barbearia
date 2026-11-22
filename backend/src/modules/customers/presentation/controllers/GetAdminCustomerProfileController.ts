import {
    GetAdminCustomerProfileDTO
} from '@/modules/customers/application/dtos/GetAdminCustomerProfileDTO';
import {
    GetAdminCustomerProfileOutput
} from '@/modules/customers/application/use-cases/GetAdminCustomerProfileUseCase';
import {
    getAdminCustomerProfileParamsSchema
} from '@/modules/customers/presentation/validators/getAdminCustomerProfile.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GetAdminCustomerProfileController implements IController {
  constructor(private readonly getAdminCustomerProfileUseCase: IUseCase<GetAdminCustomerProfileDTO, GetAdminCustomerProfileOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { id } = getAdminCustomerProfileParamsSchema.parse(request.params ?? {});

    const result = await this.getAdminCustomerProfileUseCase.execute({ id, viewer: request.user });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
