import { RegisterDTO } from '@/modules/auth/application/dtos/RegisterDTO';
import { RegisterOutput } from '@/modules/auth/application/use-cases/RegisterUseCase';
import { registerBodySchema } from '@/modules/auth/presentation/validators/register.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class RegisterController implements IController {
  constructor(private readonly registerUseCase: IUseCase<RegisterDTO, RegisterOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const { termsAccepted: _termsAccepted, ...input } = registerBodySchema.parse(request.body);

    const result = await this.registerUseCase.execute(input);
    if (result.isLeft()) throw result.value;

    const { created, auth } = result.value;

    return { statusCode: created ? HttpStatus.CREATED : HttpStatus.OK, body: auth };
  }
}
