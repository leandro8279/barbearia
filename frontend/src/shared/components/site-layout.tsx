import { usePublicUnit } from '@/modules/site/hooks/use-public-unit';

import { Brand } from '@/shared/components/brand';
import { RenderComponent } from '@/shared/components/render-component';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';

import { Menu, UserRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';

import type { ReactNode } from 'react';
const links = [
  { href: '/servicos', label: 'Serviços' },
  { href: '/barbeiros', label: 'Profissionais' },
  { href: '/contato', label: 'Contato' },
];

const footerWeekdays = [
  { weekday: 1, label: 'Seg' },
  { weekday: 2, label: 'Ter' },
  { weekday: 3, label: 'Qua' },
  { weekday: 4, label: 'Qui' },
  { weekday: 5, label: 'Sex' },
  { weekday: 6, label: 'Sáb' },
  { weekday: 0, label: 'Dom' },
];

function footerHours(unit?: ReturnType<typeof usePublicUnit>['data']) {
  if (!unit?.businessHours?.length) return null;
  return footerWeekdays.map((day) => {
    const ranges = unit.businessHours?.find((item) => Number(item.weekday) === day.weekday)?.ranges ?? [];
    const hours =
      ranges.length ?
        ranges
          .map((range) => {
            const [start, end] = Array.isArray(range) ? range : [range.start, range.end];
            return `${start}–${end}`;
          })
          .join(' · ')
      : 'Fechado';
    return { label: day.label, hours };
  });
}

interface SiteLayoutProps {
  children: ReactNode;
}

export function SiteLayout({ children }: SiteLayoutProps) {
  const [location] = useLocation();
  const unitQuery = usePublicUnit();
  const hours = footerHours(unitQuery.data);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand />
          <nav aria-label="Navegação principal" className="hidden items-center gap-7 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" aria-label="Minha conta">
              <Link href="/conta">
                <UserRound className="size-4" />
              </Link>
            </Button>
            <Button asChild className="hidden min-h-10 px-5 sm:inline-flex">
              <Link href="/agendar">Agendar</Link>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="Abrir menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(86vw,20rem)]">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <Brand />
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 grid gap-2" aria-label="Menu móvel">
                  {links.map((link) => (
                    <Link key={link.href} href={link.href} className="rounded-lg px-3 py-3 text-sm hover:bg-muted">
                      {link.label}
                    </Link>
                  ))}
                  <Button asChild className="mt-3 min-h-11">
                    <Link href="/agendar">Agendar horário</Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className={`mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 ${location === '/' ? 'pb-24 sm:pb-12' : ''}`}>{children}</main>
      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Brand />
            <p className="mt-2 text-muted-foreground">Seu tempo, seu estilo. Atendimento com hora marcada.</p>
          </div>
          <div className="text-muted-foreground sm:text-right">
            <p className="font-medium text-foreground">Horários</p>

            <RenderComponent condition={hours}>
              <ul className="mt-1 grid grid-cols-2 gap-x-5 gap-y-0.5 sm:justify-items-end">
                {hours?.map((day) => (
                  <li key={day.label}>
                    {day.label}: {day.hours}
                  </li>
                ))}
              </ul>
            </RenderComponent>

            <RenderComponent condition={!hours}>
              <p>
                <RenderComponent condition={unitQuery.isPending}>Carregando horários…</RenderComponent>

                <RenderComponent condition={!unitQuery.isPending}>
                  <Link href="/contato" className="underline underline-offset-4">
                    Consulte os horários
                  </Link>
                </RenderComponent>
              </p>
            </RenderComponent>
          </div>
        </div>
      </footer>

      <RenderComponent condition={location === '/'}>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-panel backdrop-blur sm:hidden">
          <Button asChild className="min-h-12 w-full">
            <Link href="/agendar">Agendar</Link>
          </Button>
        </div>
      </RenderComponent>
      <RenderComponent condition={location !== '/'}>
        <RenderComponent condition={!['/servicos', '/barbeiros', '/contato'].includes(location)}>
          <Button asChild className="fixed bottom-4 right-4 z-30 min-h-12 rounded-full px-6 shadow-gold sm:hidden">
            <Link href="/agendar">Agendar</Link>
          </Button>
        </RenderComponent>
      </RenderComponent>
    </div>
  );
}
