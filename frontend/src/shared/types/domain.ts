export type UserRole = 'customer' | 'barber' | 'reception' | 'manager' | 'admin'

export type Permission =
  | 'agenda.read'
  | 'agenda.write'
  | 'agenda.manage'
  | 'commissions.read'
  | 'cash.read'
  | 'cash.write'
  | 'cash.manage'
  | 'catalog.read'
  | 'catalog.write'
  | 'customers.read'
  | 'customers.write'
  | 'team.read'
  | 'team.write'
  | 'team.manage'
  | 'finance.read'
  | 'finance.write'
  | 'finance.manage'
  | 'settings.read'
  | 'settings.write'
  | 'settings.manage'

export interface SessionUser {
  id: string
  name: string
  role: UserRole
  permissions: Permission[]
}

export interface TimeInterval {
  start: number
  end: number
}
