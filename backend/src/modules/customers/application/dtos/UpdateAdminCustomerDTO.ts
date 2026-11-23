import { toUserResponse, User, UserResponseDTO } from '@/modules/users';

export interface UpdateAdminCustomerDTO {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  cpf?: string | null;
  birthDate?: string | null;
  referralSource?: string | null;
  tags: string[];
  consent: { reminders: boolean; marketing: boolean };
  actorId: string;
}

export type UpdateAdminCustomerResponseDTO = Omit<UserResponseDTO, 'tokenVersion'>;

export function toUpdateAdminCustomerResponse(customer: User): UpdateAdminCustomerResponseDTO {
  const { tokenVersion: _tokenVersion, ...response } = toUserResponse(customer);

  return response;
}
