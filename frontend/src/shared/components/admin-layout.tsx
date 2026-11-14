import { Brand } from '@/shared/components/brand';
import { sessionStore } from '@/shared/stores/session-store';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';

import {
  Bell,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ContactRound,
  LayoutDashboard,
  Menu,
  Scissors,
  Search,
  Settings2,
  UsersRound,
} from 'lucide-react';
import { Link } from 'wouter';

import type { ReactNode } from 'react';
import type { Permission } from '@/shared/types/domain';
const navItems: { href: string; label: string; icon: typeof LayoutDashboard; permission: Permission }[] = [
  { href: '/admin', label: 'Visão geral', icon: LayoutDashboard, permission: 'agenda.read' },
  { href: '/admin/meu-dia', label: 'Meu dia', icon: CalendarCheck2, permission: 'agenda.read' },
  { href: '/admin/agenda', label: 'Agenda', icon: CalendarDays, permission: 'agenda.read' },
  { href: '/admin/caixa', label: 'Caixa', icon: CircleDollarSign, permission: 'cash.read' },
  { href: '/admin/servicos', label: 'Catálogo', icon: Scissors, permission: 'catalog.read' },
  { href: '/admin/clientes', label: 'Clientes', icon: ContactRound, permission: 'customers.read' },
  { href: '/admin/equipe', label: 'Equipe', icon: UsersRound, permission: 'team.read' },
  { href: '/admin/comissoes', label: 'Comissões', icon: CircleDollarSign, permission: 'team.read' },
  { href: '/admin/usuarios', label: 'Usuários', icon: UsersRound, permission: 'team.manage' },
  { href: '/admin/financeiro', label: 'Financeiro', icon: CircleDollarSign, permission: 'finance.read' },
  { href: '/admin/config', label: 'Configurações', icon: Settings2, permission: 'settings.read' },
];

const roleGrants: Record<string, string[]> = {
  customer: [],
  barber: ['agenda.read', 'agenda.write', 'customers.read', 'catalog.read', 'commissions.read'],
  reception: ['agenda.*', 'cash.*', 'customers.*', 'catalog.read'],
  manager: ['*'],
  admin: ['*'],
};

function canNavigate(user: NonNullable<ReturnType<typeof sessionStore>['user']>, permission: Permission) {
  const grants = [...(roleGrants[user.role] ?? []), ...user.permissions];
  return grants.some((grant) => grant === '*' || grant === permission || (grant.endsWith('.*') && permission.startsWith(grant.slice(0, -1))));
}

interface AdminLayoutProps {
  children: ReactNode;
}

function AdminNav() {
  const user = sessionStore.user;
  const visibleItems = navItems.filter((item) => {
    if (!user) return false;
    if (canNavigate(user, item.permission)) return true;
    return user.role === 'barber' && ['/admin/equipe', '/admin/comissoes'].includes(item.href);
  });
  return (
    <nav aria-label="Navegação administrativa" className="space-y-1">
      {visibleItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-border bg-card/50 px-4 py-5 md:block">
        <div className="mb-8 px-2">
          <Brand />
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Painel administrativo</p>
        </div>
        <AdminNav />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Abrir navegação">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <Brand />
                </SheetTitle>
              </SheetHeader>
              <div className="mt-7">
                <AdminNav />
              </div>
            </SheetContent>
          </Sheet>
          <label className="relative ml-auto hidden w-full max-w-sm sm:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Buscar no painel" placeholder="Buscar..." className="pl-9" />
          </label>
          <Button variant="ghost" size="icon" aria-label="Alertas">
            <Bell className="size-4" />
          </Button>
          <Button variant="outline" className="min-h-10 gap-2 px-3">
            <span className="hidden text-sm sm:inline">Minha conta</span>
            <ChevronDown className="size-4" />
          </Button>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9">{children}</main>
      </div>
    </div>
  );
}
