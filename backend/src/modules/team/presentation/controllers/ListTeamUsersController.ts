import { ListTeamUsersResponseDTO } from '@/modules/team/application/dtos/ListTeamUsersDTO';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListTeamUsersController implements IController {
  constructor(private readonly listTeamUsersUseCase: IUseCase<void, ListTeamUsersResponseDTO>) {}

  async handle(_request: IRequest): Promise<IResponse> {
    const body = await this.listTeamUsersUseCase.execute();

    return { statusCode: HttpStatus.OK, body };
  }
}
