import { GuestDTO } from '@/modules/auth/application/dtos/GuestDTO';
import { GuestOutput } from '@/modules/auth/application/use-cases/GuestUseCase';
import { guestBodySchema } from '@/modules/auth/presentation/validators/guest.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GuestController implements IController {
  constructor(private readonly guestUseCase: IUseCase<GuestDTO, GuestOutput>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const input = guestBodySchema.parse(request.body);

    const result = await this.guestUseCase.execute(input);
    if (result.isLeft()) throw result.value;

    const { created, auth } = result.value;

    return { statusCode: created ? HttpStatus.CREATED : HttpStatus.OK, body: auth };
  }
}
