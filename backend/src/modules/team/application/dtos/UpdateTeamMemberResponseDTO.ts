import { toUserResponse, User, UserResponseDTO } from '@/modules/users';

export type TeamMemberDTO = Omit<UserResponseDTO, 'tokenVersion'>;

export interface UpdateTeamMemberResponseDTO {
  user: TeamMemberDTO;
}

export function toUpdateTeamMemberResponse(member: User): UpdateTeamMemberResponseDTO {
  const { tokenVersion: _tokenVersion, ...user } = toUserResponse(member);

  return { user };
}
