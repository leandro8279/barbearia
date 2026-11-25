import type {ReactNode} from 'react'
import {Redirect} from 'wouter'
import {useCan} from '@/shared/hooks/use-can'
import {useSessionStore} from '@/shared/stores/session-store'
import type {Permission, UserRole} from '@/shared/types/domain'

interface GuardProps {
  children: ReactNode
  loginTo?: string
}

export function RequireAuth({children, loginTo = '/entrar'}: GuardProps) {
  const user = useSessionStore(state => state.user)
  return user ? <>{children}</> : <Redirect to={loginTo} />
}

interface RequireRoleProps extends GuardProps {
  roles: UserRole[]
}

export function RequireRole({children, roles, loginTo = '/entrar'}: RequireRoleProps) {
  const user = useSessionStore(state => state.user)
  if (!user) return <Redirect to={loginTo} />
  return roles.includes(user.role) ? <>{children}</> : <Redirect to="/403" />
}

interface RequirePermissionProps extends GuardProps {
  permission: Permission
}

export function RequirePermission({children, permission, loginTo = '/admin/login'}: RequirePermissionProps) {
  const user = useSessionStore(state => state.user)
  const can = useCan(permission)
  if (!user) return <Redirect to={loginTo} />
  return can ? <>{children}</> : <Redirect to="/403" />
}
