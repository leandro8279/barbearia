import { Brand } from '@/shared/components/brand';

import { Link } from 'wouter';

import type { ReactNode } from 'react';
interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <aside className="hidden flex-col justify-between bg-card p-10 lg:flex">
        <Brand />
        <div className="max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Barbearia</p>
          <h1 className="mt-4 text-5xl font-semibold uppercase leading-tight">Um bom corte muda o dia.</h1>
          <p className="mt-4 text-muted-foreground">Acesse sua conta para acompanhar seus horários e preferências.</p>
        </div>
        <p className="text-xs text-muted-foreground">Atendimento feito para você.</p>
      </aside>
      <main className="flex min-h-screen flex-col px-4 py-6 sm:px-8">
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="my-auto mx-auto w-full max-w-lg py-12">{children}</div>
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Voltar ao site
          </Link>
        </p>
      </main>
    </div>
  );
}
