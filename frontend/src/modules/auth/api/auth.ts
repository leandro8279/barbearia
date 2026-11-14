import { apiRequest } from '@/shared/lib/http';

import type { Permission, SessionUser, UserRole } from '@/shared/types/domain';

interface ApiLoginUser extends Omit<SessionUser, 'id'> {
  id: number | string;
}

interface AuthResponse {
  user: ApiLoginUser;
  token: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
  staffOnly?: boolean;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    role: UserRole;
    permissions: Permission[];
  };
}

export async function login({ identifier, password, staffOnly = false }: LoginInput) {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    data: { email: identifier, password, ...(staffOnly ? { staffOnly: true } : {}) },
  });

  return { token: response.token, user: { ...response.user, id: String(response.user.id) } };
}

export async function getCurrentUser(): Promise<SessionUser> {
  const response = await apiRequest<{ user: ApiLoginUser }>('/auth/me');
  return { ...response.user, id: String(response.user.id) };
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  birthDate: string | null;
  reminders: boolean;
  termsAccepted: boolean;
}

export async function register(input: RegisterRequest) {
  const response = await apiRequest<AuthResponse>('/auth/register', { method: 'POST', data: JSON.stringify(input) });

  return { token: response.token, user: { ...response.user, id: String(response.user.id) } };
}

export async function createGuestSession(input: { name: string; phone: string }) {
  const response = await apiRequest<AuthResponse>('/auth/guest', { method: 'POST', data: JSON.stringify(input) });

  return { token: response.token, user: { ...response.user, id: String(response.user.id) } };
}

export async function requestPasswordReset(email: string) {
  return apiRequest<{ message: string }>('/auth/forgot', { method: 'POST', data: JSON.stringify({ email }) });
}

export async function resetPassword(input: { token: string; password: string }) {
  return apiRequest<{ message: string }>('/auth/reset', { method: 'POST', data: JSON.stringify(input) });
}
