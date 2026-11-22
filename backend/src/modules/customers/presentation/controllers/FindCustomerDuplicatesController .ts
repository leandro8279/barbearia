import { FindCustomerDuplicatesDTO, FindCustomerDuplicatesResponseDTO } from '@/modules/customers/application/dtos/FindCustomerDuplicatesDTO';
import { findCustomerDuplicatesQuerySchema } from '@/modules/customers/presentation/validators/findCustomerDuplicates.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class FindCustomerDuplicatesController implements IController {
  constructor(private readonly findCustomerDuplicatesUseCase: IUseCase<FindCustomerDuplicatesDTO, FindCustomerDuplicatesResponseDTO>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const query = findCustomerDuplicatesQuerySchema.parse(request.query ?? {});

    const body = await this.findCustomerDuplicatesUseCase.execute(query);

    return { statusCode: HttpStatus.OK, body };
  }
}
