import { ReactNode } from 'react';

import { useCan } from '@/shared/hooks/use-can';
import { sessionStore } from '@/shared/stores/session-store';
import { Permission, UserRole } from '@/shared/types/domain';

import { observer } from 'mobx-react-lite';
import { Redirect } from 'wouter';

interface GuardProps {
  children: ReactNode;
  loginTo?: string;
}

export const RequireAuth = observer(({ children, loginTo = '/entrar' }: GuardProps) => {
  const user = sessionStore.user;
  return user ? <>{children}</> : <Redirect to={loginTo} />;
});

interface RequireRoleProps extends GuardProps {
  roles: UserRole[];
}

export const RequireRole = observer(({ children, roles, loginTo = '/entrar' }: RequireRoleProps) => {
  const user = sessionStore.user;
  if (!user) return <Redirect to={loginTo} />;
  return roles.includes(user.role) ? <>{children}</> : <Redirect to="/403" />;
});

interface RequirePermissionProps extends GuardProps {
  permission: Permission;
}

export const RequirePermission = observer(({ children, permission, loginTo = '/admin/login' }: RequirePermissionProps) => {
  const user = sessionStore.user;
  const can = useCan(permission);
  if (!user) return <Redirect to={loginTo} />;
  return can ? <>{children}</> : <Redirect to="/403" />;
});
