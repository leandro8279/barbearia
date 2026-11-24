import { GetBusinessHoursOutput } from '@/modules/settings/application/use-cases/GetBusinessHoursUseCase';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GetBusinessHoursController implements IController {
  constructor(private readonly getBusinessHoursUseCase: IUseCase<void, GetBusinessHoursOutput>) {}

  async handle(_request: IRequest): Promise<IResponse> {
    const result = await this.getBusinessHoursUseCase.execute();
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
