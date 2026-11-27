import React, { useEffect } from 'react';

import { useAccountOverviewPage } from '@/modules/account/hooks/use-account-overview-page';

import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { AppointmentStatus, StatusBadge } from '@/shared/components/status-badge';
import { formatBRL, formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { CalendarDays, Clock3, MapPin, Repeat2, Scissors, UserRound } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { Link } from 'wouter';

const apiStatusLabels: Record<string, AppointmentStatus> = {
  pending: 'agendado',
  confirmed: 'confirmado',
  checked_in: 'aguardando',
  in_service: 'em_atendimento',
  done: 'concluido',
  canceled: 'cancelado',
  no_show: 'no_show',
};

export default function AccountOverviewPage() {
  const store = useAccountOverviewPage();

  useEffect(() => {
    document.title = 'Visão geral | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Consulte seu próximo horário e acesse rapidamente seus agendamentos.';
  }, []);

  const header = (
    <Observer>
      {() => (
        <PageHeader
          eyebrow="Minha conta"
          title={store.headerTitle}
          description="Acompanhe seus horários e volte a agendar quando quiser."
          actions={
            <Button asChild className="min-h-11">
              <Link href="/agendar">
                <CalendarDays aria-hidden="true" />
                Agendar de novo
              </Link>
            </Button>
          }
        />
      )}
    </Observer>
  );

  return (
    <React.Fragment>
      <Observer>
        {() => (
          <RenderComponent condition={store.isPending}>
            <div className="space-y-6">
              {header}
              <Skeleton className="h-64 rounded-2xl" aria-label="Carregando seu próximo agendamento" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={store.isError}>
            <div className="space-y-6">
              {header}
              <ErrorState title="Não foi possível carregar sua conta" description="Confira sua conexão e tente carregar os dados novamente." onRetry={() => store.refetch()} />
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={store.isSuccess}>
            <div className="space-y-6">
              {header}

              <Card className="overflow-hidden border-primary/25">
                <CardHeader className="border-b border-border/70 bg-primary/5">
                  <p className="text-sm font-semibold text-primary">Seu próximo agendamento</p>
                  <CardTitle className="text-xl">Um horário reservado para você</CardTitle>
                </CardHeader>
                <CardContent className="p-5 sm:p-6">
                  <RenderComponent condition={store.upcoming}>
                    <div className="space-y-6">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <CalendarDays className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                          <div>
                            <p className="text-sm text-muted-foreground">Data e hora</p>
                            <p className="mt-1 font-semibold">{formatDateTime(store.upcoming?.start ?? '')}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <UserRound className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                          <div>
                            <p className="text-sm text-muted-foreground">Barbeiro</p>
                            <p className="mt-1 font-semibold">{store.barberName}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 sm:col-span-2">
                          <Scissors className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                          <div>
                            <p className="text-sm text-muted-foreground">Serviços</p>
                            <p className="mt-1 font-semibold">{store.serviceNames.length ? store.serviceNames.join(' · ') : 'Serviços não informados'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                        <div className="flex items-center gap-3">
                          <StatusBadge kind="appointment" status={apiStatusLabels[store.upcoming?.status ?? ''] ?? store.upcoming?.status.replaceAll('_', ' ')} />
                          <span className="text-sm text-muted-foreground">Total {formatBRL(store.upcoming?.total ?? 0)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Código {store.upcoming?.code}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button asChild className="min-h-11">
                          <Link href={`/conta/agendamentos?reagendar=1&appointmentId=${store.upcoming?.id}`}>Reagendar</Link>
                        </Button>
                        <Button asChild variant="outline" className="min-h-11">
                          <Link href={store.cancelHref}>Cancelar</Link>
                        </Button>
                        <Button asChild variant="outline" className="min-h-11">
                          <a href={store.directionsUrl} target="_blank" rel="noreferrer">
                            <MapPin aria-hidden="true" />
                            Como chegar
                          </a>
                        </Button>
                      </div>
                    </div>
                  </RenderComponent>

                  <RenderComponent condition={!store.upcoming}>
                    <EmptyState
                      title="Você ainda não tem um próximo horário"
                      description="Escolha um serviço e encontre um horário para sua próxima visita."
                      actionLabel="Agendar horário"
                      onAction={() => store.goToBooking()}
                    />
                  </RenderComponent>
                </CardContent>
              </Card>

              <section className="grid gap-4 sm:grid-cols-2" aria-label="Atalhos de agendamento">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                      Agendar de novo
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Veja os serviços e horários disponíveis.</p>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="min-h-11 w-full">
                      <Link href="/agendar">Escolher horário</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Repeat2 className="size-4 text-primary" aria-hidden="true" />
                      Repetir último corte
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Use os mesmos serviços e profissional do último atendimento concluído.</p>
                  </CardHeader>
                  <CardContent>
                    <Button className="min-h-11 w-full" variant="outline" disabled={!store.canRepeatLastCut} onClick={() => store.repeatLastCut()}>
                      <Scissors aria-hidden="true" />
                      {store.repeatLabel}
                    </Button>
                  </CardContent>
                </Card>
              </section>

              <RenderComponent condition={!store.upcoming && store.lastCut}>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="size-4" aria-hidden="true" />
                  Seu último atendimento foi em {formatDateTime(store.lastCut?.start ?? '')}.
                </p>
              </RenderComponent>
            </div>
          </RenderComponent>
        )}
      </Observer>
    </React.Fragment>
  );
}
