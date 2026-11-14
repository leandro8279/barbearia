import { apiRequest } from '@/shared/lib/http';

import type { SessionUser } from '@/shared/types/domain';

export interface AccountAddress {
  id: string;
  label: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
}

export interface AccountProfile extends SessionUser {
  email: string | null;
  phone: string;
  cpf: string | null;
  birthDate: string | null;
  avatar: string | null;
  addresses: AccountAddress[];
}

export type UpdateAccountProfileInput = Partial<Pick<AccountProfile, 'name' | 'email' | 'phone' | 'cpf' | 'birthDate' | 'avatar' | 'addresses'>> & {
  currentPassword?: string;
};

export async function getAccountProfile(): Promise<AccountProfile> {
  const user = await apiRequest<Omit<AccountProfile, 'id'> & { id: number | string }>('/users/me');
  return { ...user, id: String(user.id), addresses: user.addresses ?? [] };
}

export async function updateAccountProfile(input: UpdateAccountProfileInput): Promise<AccountProfile> {
  const user = await apiRequest<Omit<AccountProfile, 'id'> & { id: number | string }>('/users/me', { method: 'PATCH', data: input });
  return { ...user, id: String(user.id), addresses: user.addresses ?? [] };
}
