import { toUserResponse, User, UserResponseDTO } from '@/modules/users';

export interface CreateAdminCustomerDTO {
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

export type CreateAdminCustomerResponseDTO = Omit<UserResponseDTO, 'tokenVersion'>;

export function toCreateAdminCustomerResponse(user: User): CreateAdminCustomerResponseDTO {
  const { tokenVersion: _tokenVersion, ...customer } = toUserResponse(user);

  return customer;
}
