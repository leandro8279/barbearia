import {
    SaveNotificationSettingsDTO
} from '@/modules/settings/application/dtos/SaveNotificationSettingsDTO';
import {
    SaveNotificationSettingsOutput
} from '@/modules/settings/application/use-cases/SaveNotificationSettingsUseCase';
import {
    saveNotificationSettingsBodySchema
} from '@/modules/settings/presentation/validators/saveNotificationSettings.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class SaveNotificationSettingsController implements IController {
  constructor(private readonly saveNotificationSettingsUseCase: IUseCase<SaveNotificationSettingsDTO, SaveNotificationSettingsOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const body = saveNotificationSettingsBodySchema.parse(request.body);

    const result = await this.saveNotificationSettingsUseCase.execute({ ...body, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
