import { ResendNotificationDTO } from '@/modules/settings/application/dtos/ResendNotificationDTO';
import {
    ResendNotificationOutput
} from '@/modules/settings/application/use-cases/ResendNotificationUseCase';
import {
    resendNotificationParamsSchema
} from '@/modules/settings/presentation/validators/resendNotification.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ResendNotificationController implements IController {
  constructor(private readonly resendNotificationUseCase: IUseCase<ResendNotificationDTO, ResendNotificationOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { id } = resendNotificationParamsSchema.parse(request.params ?? {});

    const result = await this.resendNotificationUseCase.execute({ id, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.CREATED, body: result.value };
  }
}
