import { ResetPasswordDTO } from '@/modules/auth/application/dtos/ResetPasswordDTO';
import { ResetPasswordOutput } from '@/modules/auth/application/use-cases/ResetPasswordUseCase';
import { resetBodySchema } from '@/modules/auth/presentation/validators/reset.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ResetPasswordController implements IController {
  constructor(private readonly resetPasswordUseCase: IUseCase<ResetPasswordDTO, ResetPasswordOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const input = resetBodySchema.parse(request.body);

    const result = await this.resetPasswordUseCase.execute(input);
    if (result.isLeft()) throw result.value;

    return { statusCode: HttpStatus.OK, body: result.value };
  }
}
