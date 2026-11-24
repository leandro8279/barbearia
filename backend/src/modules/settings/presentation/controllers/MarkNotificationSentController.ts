import { MarkNotificationSentDTO } from '@/modules/settings/application/dtos/MarkNotificationSentDTO';
import { MarkNotificationSentOutput } from '@/modules/settings/application/use-cases/MarkNotificationSentUseCase';
import { markNotificationSentParamsSchema } from '@/modules/settings/presentation/validators/markNotificationSent.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class MarkNotificationSentController implements IController {
  constructor(private readonly markNotificationSentUseCase: IUseCase<MarkNotificationSentDTO, MarkNotificationSentOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { id } = markNotificationSentParamsSchema.parse(request.params ?? {});

    const result = await this.markNotificationSentUseCase.execute({ id, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.CREATED, body: result.value };
  }
}
