import { GetMeDTO } from '@/modules/auth/application/dtos/GetMeDTO';
import { GetMeResponseDTO, toGetMeResponse } from '@/modules/auth/application/dtos/GetMeResponseDTO';
import { IUserRepository } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export type GetMeOutput = Either<UnauthorizedError, GetMeResponseDTO>;

export class GetMeUseCase implements IUseCase<GetMeDTO, GetMeOutput> {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute({ id, tokenVersion = 0 }: GetMeDTO): Promise<GetMeOutput> {
    const user = await this.userRepository.findById(id);

    if (!user || !user.active || user.tokenVersion !== tokenVersion) {
      return left(new UnauthorizedError('Token inválido ou expirado'));
    }

    return right(toGetMeResponse(user));
  }
}
