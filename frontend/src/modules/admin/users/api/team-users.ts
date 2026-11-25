import {apiRequest} from '@/shared/lib/http'
import type {Permission, UserRole} from '@/shared/types/domain'

export type StaffRole = Exclude<UserRole, 'customer'>

export interface StaffUser {
  id: number
  name: string
  email: string | null
  role: StaffRole
  permissions: string[]
  effectivePermissions: Permission[]
  active: boolean
  hasPassword: boolean
  lastAccessAt: string | null
}

export interface TeamUsersResponse {
  users: StaffUser[]
  roles: StaffRole[]
  permissionKeys: Permission[]
  roleDefaults: Record<StaffRole, Permission[]>
}

export interface StaffUserUpdate {
  role?: StaffRole
  active?: boolean
  permissions?: Permission[]
}

export async function getTeamUsers() {
  return apiRequest<TeamUsersResponse>('/admin/users')
}

export async function inviteTeamUser(input: {email: string; role: StaffRole}) {
  return apiRequest<{user: StaffUser; inviteToken: string | null; inviteSent: boolean}>('/admin/users/invite', {method: 'POST', body: JSON.stringify(input)})
}

export async function updateTeamUser(id: number, input: StaffUserUpdate) {
  return apiRequest<{user: StaffUser}>(`/admin/users/${id}`, {method: 'PATCH', body: JSON.stringify(input)})
}
