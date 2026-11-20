import { hasPermission } from '@/shared/auth/hasPermission';

import { describe, expect, it } from 'vitest';

describe('hasPermission', () => {
  it('nega sem usuário', () => {
    expect(hasPermission(undefined, 'agenda.read')).toBe(false);
  });

  it('admin pode tudo', () => {
    expect(hasPermission({ id: '1', role: 'admin' }, 'settings.manage')).toBe(true);
  });

  it('manager pode tudo, menos settings.manage', () => {
    expect(hasPermission({ id: '1', role: 'manager' }, 'cash.write')).toBe(true);
    expect(hasPermission({ id: '1', role: 'manager' }, 'settings.manage')).toBe(false);
  });

  it('reception: wildcards de agenda, caixa e clientes; catálogo só leitura', () => {
    const user = { id: '1', role: 'reception' as const };
    expect(hasPermission(user, 'agenda.write')).toBe(true);
    expect(hasPermission(user, 'cash.write')).toBe(true);
    expect(hasPermission(user, 'customers.write')).toBe(true);
    expect(hasPermission(user, 'catalog.read')).toBe(true);
    expect(hasPermission(user, 'catalog.write')).toBe(false);
    expect(hasPermission(user, 'commissions.read')).toBe(false);
  });

  it('barber: agenda, leitura de clientes/catálogo e comissões; sem caixa', () => {
    const user = { id: '1', role: 'barber' as const };
    expect(hasPermission(user, 'agenda.write')).toBe(true);
    expect(hasPermission(user, 'commissions.read')).toBe(true);
    expect(hasPermission(user, 'customers.write')).toBe(false);
    expect(hasPermission(user, 'cash.read')).toBe(false);
  });

  it('soma permissões individuais às do papel', () => {
    const user = { id: '1', role: 'barber' as const, permissions: ['cash.read'] };
    expect(hasPermission(user, 'cash.read')).toBe(true);
    expect(hasPermission(user, 'cash.write')).toBe(false);
  });

  it('customer é negado em tudo', () => {
    expect(hasPermission({ id: '1', role: 'customer' }, 'agenda.read')).toBe(false);
  });
});
