import { LoginDTO } from '@/modules/auth/application/dtos/LoginDTO';
import { LoginOutput } from '@/modules/auth/application/use-cases/LoginUseCase';
import { loginBodySchema } from '@/modules/auth/presentation/validators/login.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class LoginController implements IController {
  constructor(private readonly loginUseCase: IUseCase<LoginDTO, LoginOutput>) {}

  public async handle(request: IRequest): Promise<IResponse> {
    const input = loginBodySchema.parse(request.body);

    const result = await this.loginUseCase.execute(input);
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
