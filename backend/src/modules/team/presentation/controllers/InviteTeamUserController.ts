import { InviteTeamUserDTO } from '@/modules/team/application/dtos/InviteTeamUserDTO';
import { InviteTeamUserOutput } from '@/modules/team/application/use-cases/InviteTeamUserUseCase';
import { inviteTeamUserBodySchema } from '@/modules/team/presentation/validators/inviteTeamUser.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class InviteTeamUserController implements IController {
  constructor(private readonly inviteTeamUserUseCase: IUseCase<InviteTeamUserDTO, InviteTeamUserOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { email, role } = inviteTeamUserBodySchema.parse(request.body);

    const result = await this.inviteTeamUserUseCase.execute({ email, role, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.CREATED, body: result.value };
  }
}
