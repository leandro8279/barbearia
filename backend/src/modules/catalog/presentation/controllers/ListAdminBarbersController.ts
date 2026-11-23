import { ListAdminBarbersResponseDTO } from '@/modules/catalog/application/dtos/ListAdminBarbersDTO';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListAdminBarbersController implements IController {
  constructor(private readonly listAdminBarbersUseCase: IUseCase<void, ListAdminBarbersResponseDTO>) {}

  async handle(_request: IRequest): Promise<IResponse> {
    const body = await this.listAdminBarbersUseCase.execute();

    return { statusCode: HttpStatus.OK, body };
  }
}
