import { SaveBusinessHoursDTO } from '@/modules/settings/application/dtos/SaveBusinessHoursDTO';
import { SaveBusinessHoursOutput } from '@/modules/settings/application/use-cases/SaveBusinessHoursUseCase';
import { saveBusinessHoursBodySchema } from '@/modules/settings/presentation/validators/saveBusinessHours.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class SaveBusinessHoursController implements IController {
  constructor(private readonly saveBusinessHoursUseCase: IUseCase<SaveBusinessHoursDTO, SaveBusinessHoursOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const body = saveBusinessHoursBodySchema.parse(request.body);

    const result = await this.saveBusinessHoursUseCase.execute({ ...body, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
