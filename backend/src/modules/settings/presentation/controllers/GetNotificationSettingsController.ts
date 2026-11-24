import {
    GetNotificationSettingsResponseDTO
} from '@/modules/settings/application/dtos/GetNotificationSettingsDTO';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GetNotificationSettingsController implements IController {
  constructor(private readonly getNotificationSettingsUseCase: IUseCase<void, GetNotificationSettingsResponseDTO>) {}

  async handle(_request: IRequest): Promise<IResponse> {
    const body = await this.getNotificationSettingsUseCase.execute();

    return { statusCode: HttpStatus.OK, body };
  }
}
