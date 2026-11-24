import { GetBookingSettingsResponseDTO } from '@/modules/settings/application/dtos/GetBookingSettingsDTO';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GetBookingSettingsController implements IController {
  constructor(private readonly getBookingSettingsUseCase: IUseCase<void, GetBookingSettingsResponseDTO>) {}

  async handle(_request: IRequest): Promise<IResponse> {
    const body = await this.getBookingSettingsUseCase.execute();

    return { statusCode: HttpStatus.OK, body };
  }
}
