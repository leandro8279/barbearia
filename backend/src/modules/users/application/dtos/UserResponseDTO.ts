import { User } from '@/modules/users/domain/entities/User';

export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  cpf: string | null;
  birthDate: string | null;
  addresses: User['addresses'];
  tags: string[];
  referralSource: string | null;
  avatar: string | null;
  permissions: string[];
  active: boolean;
  guest: boolean;
  tokenVersion: number;
  lastAccessAt: string | null;
  consent: {
    reminders: boolean;
    marketing: boolean;
    at: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export function toUserResponse(user: User): UserResponseDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    cpf: user.cpf,
    birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
    addresses: user.addresses,
    tags: user.tags,
    referralSource: user.referralSource,
    avatar: user.avatar,
    permissions: user.permissions,
    active: user.active,
    guest: user.guest,
    tokenVersion: user.tokenVersion,
    lastAccessAt: user.lastAccessAt?.toISOString() ?? null,
    consent: user.consent
      ? {
          reminders: user.consent.reminders,
          marketing: user.consent.marketing,
          at: user.consent.at.toISOString(),
        }
      : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
