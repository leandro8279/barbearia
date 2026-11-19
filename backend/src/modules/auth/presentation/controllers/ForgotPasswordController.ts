import { ForgotPasswordDTO } from '@/modules/auth/application/dtos/ForgotPasswordDTO';
import { ForgotPasswordOutput } from '@/modules/auth/application/use-cases/ForgotPasswordUseCase';
import { forgotPasswordBodySchema } from '@/modules/auth/presentation/validators/forgot.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ForgotPasswordController implements IController {
  constructor(private readonly forgotPasswordUseCase: IUseCase<ForgotPasswordDTO, ForgotPasswordOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const input = forgotPasswordBodySchema.parse(request.body);
    const output = await this.forgotPasswordUseCase.execute(input);

    return { statusCode: HttpStatus.OK, body: output };
  }
}
