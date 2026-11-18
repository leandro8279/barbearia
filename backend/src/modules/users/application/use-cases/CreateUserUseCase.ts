import { CreateUserDTO } from '@/modules/users/application/dtos/CreateUserDTO';
import { toUserResponse, UserResponseDTO } from '@/modules/users/application/dtos/UserResponseDTO';
import { EmailAlreadyExistsError } from '@/modules/users/application/errors/EmailAlreadyExistsError';
import { User } from '@/modules/users/domain/entities/User';
import { IUserRepository } from '@/modules/users/domain/repositories/UserRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export type CreateUserOutput = Either<EmailAlreadyExistsError, UserResponseDTO>;

export class CreateUserUseCase implements IUseCase<CreateUserDTO, CreateUserOutput> {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(input: CreateUserDTO): Promise<CreateUserOutput> {
    const exists = await this.userRepository.findByEmail(input.email.toLowerCase());
    if (exists) return left(new EmailAlreadyExistsError());

    const user = User.create({ name: input.name, email: input.email, passwordHash: input.password });
    const created = await this.userRepository.create(user);

    return right(toUserResponse(created));
  }
}
