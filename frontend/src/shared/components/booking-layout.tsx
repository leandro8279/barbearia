import { Brand } from '@/shared/components/brand';
import { useBookingDraftUrlSync } from '@/shared/hooks/use-booking-draft-url-sync';
import { Button } from '@/shared/ui/button';

import { Link, useLocation } from 'wouter';

import type { ReactNode } from 'react';
const steps = [
  { href: '/agendar', label: 'Serviços', number: '01' },
  { href: '/agendar/profissional', label: 'Profissional', number: '02' },
  { href: '/agendar/horario', label: 'Data e hora', number: '03' },
  { href: '/agendar/dados', label: 'Dados e revisão', number: '04' },
];

interface BookingLayoutProps {
  children: ReactNode;
}

export function BookingLayout({ children }: BookingLayoutProps) {
  const [location] = useLocation();
  useBookingDraftUrlSync();

  const activeIndex =
    location === '/agendar/revisao' || location.startsWith('/agendar/confirmado/') ?
      steps.length - 1
    : steps.findIndex((step) => step.href === location);

  return (
    <div className="min-h-screen pb-24">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Sair do agendamento</Link>
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
        <nav aria-label="Etapas do agendamento">
          <ol className="grid grid-cols-4 gap-1 sm:gap-3">
            {steps.map((step, index) => (
              <li key={step.href}>
                <div
                  aria-current={index === activeIndex ? 'step' : undefined}
                  className={`border-t-2 pt-2 ${index <= activeIndex ? 'border-primary text-foreground' : 'border-border text-muted-foreground'}`}
                >
                  <span className="text-[10px] font-semibold tracking-wider sm:text-xs">{step.number}</span>
                  <span className="mt-1 hidden text-xs sm:block">{step.label}</span>
                </div>
              </li>
            ))}
          </ol>
        </nav>
        <main className="mt-8">{children}</main>
      </div>
    </div>
  );
}
