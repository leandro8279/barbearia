import type { StaffRole } from '@/modules/team/domain/entities/StaffRole';
import { toUserResponse, User, UserResponseDTO } from '@/modules/users';

export interface InviteTeamUserDTO {
  email: string;
  role: StaffRole;
  actorId: string;
}

export type InvitedUserDTO = Omit<UserResponseDTO, 'tokenVersion'>;

export interface InviteTeamUserResponseDTO {
  user: InvitedUserDTO;
  inviteToken: string | null;
  inviteSent: boolean;
}

export function toInviteTeamUserResponse(user: User, inviteToken: string | null): InviteTeamUserResponseDTO {
  const { tokenVersion: _tokenVersion, ...safe } = toUserResponse(user);

  return { user: safe, inviteToken, inviteSent: inviteToken === null };
}
