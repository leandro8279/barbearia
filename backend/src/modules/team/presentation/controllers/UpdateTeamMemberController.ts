import { UpdateTeamMemberDTO } from '@/modules/team/application/dtos/UpdateTeamMemberDTO';
import { UpdateTeamMemberOutput } from '@/modules/team/application/use-cases/UpdateTeamMemberUseCase';
import { updateTeamMemberBodySchema, updateTeamMemberParamsSchema } from '@/modules/team/presentation/validators/updateTeamMember.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class UpdateTeamMemberController implements IController {
  constructor(private readonly updateTeamMemberUseCase: IUseCase<UpdateTeamMemberDTO, UpdateTeamMemberOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    if (!request.user) throw new UnauthorizedError('Token não informado');

    const { id } = updateTeamMemberParamsSchema.parse(request.params ?? {});
    const body = updateTeamMemberBodySchema.parse(request.body ?? {});

    const result = await this.updateTeamMemberUseCase.execute({ id, ...body, actorId: request.user.id });
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
