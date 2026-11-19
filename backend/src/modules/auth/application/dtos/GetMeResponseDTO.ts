import { toUserResponse, User, UserResponseDTO } from '@/modules/users';

export type MeUserDTO = Omit<UserResponseDTO, 'tokenVersion'>;

export interface GetMeResponseDTO {
  user: MeUserDTO;
}

export function toGetMeResponse(user: User): GetMeResponseDTO {
  const { tokenVersion: _tokenVersion, ...me } = toUserResponse(user);

  return { user: me };
}
