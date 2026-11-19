import { toUserResponse, User, UserResponseDTO } from '@/modules/users';

export interface RegisterResponseDTO {
  user: UserResponseDTO;
  token: string;
}

export function toRegisterResponse(user: User, token: string): RegisterResponseDTO {
  return { user: toUserResponse(user), token };
}
