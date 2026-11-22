import { ListAdminCustomersDTO, ListAdminCustomersResponseDTO } from '@/modules/customers/application/dtos/ListAdminCustomersDTO';
import { listAdminCustomersQuerySchema } from '@/modules/customers/presentation/validators/listAdminCustomers.schema';

import { hasPermission } from '@/shared/auth/hasPermission';
import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListAdminCustomersController implements IController {
  constructor(private readonly listAdminCustomersUseCase: IUseCase<ListAdminCustomersDTO, ListAdminCustomersResponseDTO>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const query = listAdminCustomersQuerySchema.parse(request.query ?? {});

    const body = await this.listAdminCustomersUseCase.execute({
      page: query.page,
      pageSize: query.limit,
      search: query.q,
      noVisitDays: query.noVisitDays,
      birthdayMonth: query.birthday === 'month',
      sortField: query.sort,
      direction: query.order,
      canViewFullPhone: hasPermission(request.user, 'customers.write'),
    });

    return { statusCode: HttpStatus.OK, body };
  }
}
