import { ReactNode } from 'react';

import { Brand } from '@/shared/components/brand';

import { CalendarDays, CircleUserRound, LayoutDashboard } from 'lucide-react';
import { Link } from 'wouter';

const links = [
  { href: '/conta', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/conta/agendamentos', label: 'Agendamentos', icon: CalendarDays },
  { href: '/conta/perfil', label: 'Meu perfil', icon: CircleUserRound },
];

interface AccountLayoutProps {
  children: ReactNode;
}

export function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar ao site
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[14rem_1fr] md:py-10">
        <nav aria-label="Menu da conta" className="flex gap-2 overflow-x-auto md:block md:space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground md:flex"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
