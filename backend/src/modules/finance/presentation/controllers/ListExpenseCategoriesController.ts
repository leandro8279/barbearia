import { ListExpenseCategoriesResponseDTO } from '@/modules/finance/application/dtos/ListExpenseCategoriesDTO';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListExpenseCategoriesController implements IController {
  constructor(private readonly listExpenseCategoriesUseCase: IUseCase<void, ListExpenseCategoriesResponseDTO>) {}

  async handle(_request: IRequest): Promise<IResponse> {
    const body = await this.listExpenseCategoriesUseCase.execute();

    return { statusCode: HttpStatus.OK, body };
  }
}
