import { hasPermission } from '@/shared/auth/hasPermission';

import { describe, expect, it } from 'vitest';

describe('hasPermission', () => {
  it('nega quando não há usuário', () => {
    expect(hasPermission(undefined, 'appointments.read')).toBe(false);
  });

  it('admin pode tudo', () => {
    expect(hasPermission({ id: '1', role: 'admin' }, 'settings.manage')).toBe(true);
  });

  it('manager pode tudo, menos settings.manage', () => {
    expect(hasPermission({ id: '1', role: 'manager' }, 'users.delete')).toBe(true);
    expect(hasPermission({ id: '1', role: 'manager' }, 'settings.manage')).toBe(false);
  });

  it('respeita wildcard de prefixo', () => {
    expect(hasPermission({ id: '1', role: 'reception' }, 'appointments.cancel')).toBe(true);
    expect(hasPermission({ id: '1', role: 'reception' }, 'users.read')).toBe(false);
  });

  it('soma permissões individuais às do papel', () => {
    const user = { id: '1', role: 'barber' as const, permissions: ['reports.read'] };
    expect(hasPermission(user, 'reports.read')).toBe(true);
    expect(hasPermission(user, 'reports.write')).toBe(false);
  });

  it('customer sem permissões é negado', () => {
    expect(hasPermission({ id: '1', role: 'customer' }, 'appointments.read')).toBe(false);
  });
});
