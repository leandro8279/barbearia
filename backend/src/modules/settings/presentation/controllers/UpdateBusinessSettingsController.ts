import { UpdateBusinessSettingsDTO } from '@/modules/settings/application/dtos/UpdateBusinessSettingsDTO';
import { UpdateBusinessSettingsOutput } from '@/modules/settings/application/use-cases/UpdateBusinessSettingsUseCase';
import { updateBusinessSettingsBodySchema } from '@/modules/settings/presentation/validators/updateBusinessSettings.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class UpdateBusinessSettingsController implements IController {
  constructor(private readonly updateBusinessSettingsUseCase: IUseCase<UpdateBusinessSettingsDTO, UpdateBusinessSettingsOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { logo, ...body } = updateBusinessSettingsBodySchema.parse(request.body);

    const result = await this.updateBusinessSettingsUseCase.execute({ ...body, logo: logo || null, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
