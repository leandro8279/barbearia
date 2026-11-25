import { ListExpensesDTO, ListExpensesResponseDTO } from '@/modules/finance/application/dtos/ListExpensesDTO';
import { listExpensesQuerySchema } from '@/modules/finance/presentation/validators/listExpenses.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListExpensesController implements IController {
  constructor(private readonly listExpensesUseCase: IUseCase<ListExpensesDTO, ListExpensesResponseDTO>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const query = listExpensesQuerySchema.parse(request.query ?? {});

    const body = await this.listExpensesUseCase.execute({
      page: query.page,
      pageSize: query.limit,
      search: query.q,
      category: query.category,
      status: query.status,
      dueFrom: query.from,
      dueTo: query.to,
      sortField: query.sort,
      direction: query.order,
    });

    return { statusCode: HttpStatus.OK, body };
  }
}
