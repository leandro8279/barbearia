import { toUserResponse, User, UserResponseDTO } from '@/modules/users';

export type LoginUserDTO = Omit<UserResponseDTO, 'tokenVersion'>;

export interface LoginResponseDTO {
  user: LoginUserDTO;
  token: string;
}

export function toLoginResponse(user: User, token: string): LoginResponseDTO {
  const { tokenVersion: _tokenVersion, ...result } = toUserResponse(user);

  return { user: result, token };
}
