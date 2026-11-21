import { ListAdminProductsDTO, ListAdminProductsResponseDTO } from '@/modules/catalog/application/dtos/ListAdminProductsDTO';
import { listAdminProductsQuerySchema } from '@/modules/catalog/presentation/validators/listAdminProducts.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListAdminProductsController implements IController {
  constructor(private readonly listAdminProductsUseCase: IUseCase<ListAdminProductsDTO, ListAdminProductsResponseDTO>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const query = listAdminProductsQuerySchema.parse(request.query ?? {});

    const body = await this.listAdminProductsUseCase.execute({
      page: query.page,
      pageSize: query.limit,
      search: query.q,
      categoryId: query.categoryId,
      kind: query.kind,
      stock: query.stock,
      sortField: query.sort,
      direction: query.order,
    });

    return { statusCode: HttpStatus.OK, body };
  }
}
