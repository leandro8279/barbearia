import { ListAdminServicesDTO, ListAdminServicesResponseDTO } from '@/modules/catalog/application/dtos/ListAdminServicesDTO';
import { listAdminServicesQuerySchema } from '@/modules/catalog/presentation/validators/listAdminServices.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListAdminServicesController implements IController {
  constructor(private readonly listAdminServicesUseCase: IUseCase<ListAdminServicesDTO, ListAdminServicesResponseDTO>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const query = listAdminServicesQuerySchema.parse(request.query ?? {});

    const body = await this.listAdminServicesUseCase.execute({
      page: query.page,
      pageSize: query.limit,
      search: query.q,
      categoryId: query.categoryId,
      active: query.active,
      sortField: query.sort,
      direction: query.order,
    });

    return { statusCode: HttpStatus.OK, body };
  }
}
