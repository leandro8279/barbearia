import { LoginDTO } from '@/modules/auth/application/dtos/LoginDTO';
import { LoginResponseDTO, toLoginResponse } from '@/modules/auth/application/dtos/LoginResponseDTO';
import { InvalidCredentialsError } from '@/modules/auth/application/errors/InvalidCredentialsError';
import { UserInactiveError } from '@/modules/auth/application/errors/UserInactiveError';
import { IUserRepository } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IHashProvider } from '@/shared/providers/hash/HashProviderInterface';
import { ITokenProvider } from '@/shared/providers/token/TokenProviderInterface';

export type LoginError = InvalidCredentialsError | UserInactiveError;
export type LoginOutput = Either<LoginError, LoginResponseDTO>;

export class LoginUseCase implements IUseCase<LoginDTO, LoginOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashProvider: IHashProvider,
    private readonly tokenProvider: ITokenProvider,
  ) {}

  public async execute(input: LoginDTO): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) return left(new InvalidCredentialsError());

    const passwordMatches = await this.hashProvider.compare(input.password, user.passwordHash!);

    if (!passwordMatches) return left(new InvalidCredentialsError());

    if (!user.active) return left(new UserInactiveError());

    const token = this.tokenProvider.sign({ id: user.id, tokenVersion: user.tokenVersion });

    return right(toLoginResponse(user, token));
  }
}
