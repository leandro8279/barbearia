import { GetBusinessSettingsOutput } from '@/modules/settings/application/use-cases/GetBusinessSettingsUseCase';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GetBusinessSettingsController implements IController {
  constructor(private readonly getBusinessSettingsUseCase: IUseCase<void, GetBusinessSettingsOutput>) {}

  async handle(_request: IRequest): Promise<IResponse> {
    const result = await this.getBusinessSettingsUseCase.execute();
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
