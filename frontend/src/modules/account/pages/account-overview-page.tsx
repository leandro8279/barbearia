import React, { useEffect } from 'react';

import { useAccountAppointments, useAccountBarbers, useAccountUser } from '@/modules/account/hooks/use-account-data';
import { useRepeatAppointment } from '@/modules/account/hooks/use-repeat-appointment';
import { usePublicUnit } from '@/modules/site/hooks/use-public-unit';

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
import { reaction } from 'mobx';
import { Observer, observer, useLocalObservable } from 'mobx-react-lite';
import { Link, useLocation } from 'wouter';

const AccountOverviewHeader = observer(() => {
  const userQuery = useAccountUser();

  return (
    <PageHeader
      eyebrow="Minha conta"
      title={userQuery.profile ? `Olá, ${userQuery.profile.name?.split(' ')[0]}` : 'Visão geral'}
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
  );
});

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
  const unitQuery = usePublicUnit();
  const [, navigate] = useLocation();
  const userQuery = useAccountUser();
  const barbersQuery = useAccountBarbers();
  const repeatAppointment = useRepeatAppointment();
  const upcomingQuery = useAccountAppointments({ view: 'upcoming', page: 1, limit: 1 });
  const lastCutQuery = useAccountAppointments({ view: 'past', page: 1, limit: 1, status: 'done' });
  const store = useLocalObservable(() => ({
    mapDestination: 'barbearia',
    setMapDestination(value: string) {
      this.mapDestination = value;
    },
    get directionsUrl() {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.mapDestination)}`;
    },
  }));

  useEffect(() => {
    const dispose = reaction(
      () => unitQuery.unit,
      () => {
        store.setMapDestination(unitQuery.unit?.address?.trim() || unitQuery.unit?.name?.trim() || 'barbearia');
      },
    );

    return () => dispose();
  }, [store, unitQuery]);

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

  return (
    <React.Fragment>
      <Observer>
        {() => (
          <RenderComponent condition={userQuery.result.isPending || upcomingQuery.result.isPending || lastCutQuery.result.isPending}>
            <div className="space-y-6">
              <AccountOverviewHeader />
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
          <RenderComponent condition={userQuery.result.isError || upcomingQuery.result.isError || lastCutQuery.result.isError}>
            <div className="space-y-6">
              <AccountOverviewHeader />
              <ErrorState
                title="Não foi possível carregar sua conta"
                description="Confira sua conexão e tente carregar os dados novamente."
                onRetry={() => {
                  void userQuery.result.refetch();
                  void upcomingQuery.result.refetch();
                  void lastCutQuery.result.refetch();
                }}
              />
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={userQuery.result.isSuccess || upcomingQuery.result.isSuccess || lastCutQuery.result.isSuccess}>
            <div className="space-y-6">
              <AccountOverviewHeader />

              <Card className="overflow-hidden border-primary/25">
                <CardHeader className="border-b border-border/70 bg-primary/5">
                  <p className="text-sm font-semibold text-primary">Seu próximo agendamento</p>
                  <CardTitle className="text-xl">Um horário reservado para você</CardTitle>
                </CardHeader>
                <CardContent className="p-5 sm:p-6">
                  <RenderComponent condition={upcomingQuery.upcoming}>
                    <div className="space-y-6">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <CalendarDays className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                          <div>
                            <p className="text-sm text-muted-foreground">Data e hora</p>
                            <p className="mt-1 font-semibold">{formatDateTime(upcomingQuery.upcoming?.start)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <UserRound className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                          <div>
                            <p className="text-sm text-muted-foreground">Barbeiro</p>
                            <p className="mt-1 font-semibold">{barbersQuery.barberName(upcomingQuery.upcoming?.barberId)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 sm:col-span-2">
                          <Scissors className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                          <div>
                            <p className="text-sm text-muted-foreground">Serviços</p>
                            <p className="mt-1 font-semibold">
                              {upcomingQuery.serviceNames.length ? upcomingQuery.serviceNames.join(' · ') : 'Serviços não informados'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                        <div className="flex items-center gap-3">
                          <StatusBadge
                            kind="appointment"
                            status={apiStatusLabels[upcomingQuery.upcoming?.status] ?? upcomingQuery.upcoming?.status.replaceAll('_', ' ')}
                          />
                          <span className="text-sm text-muted-foreground">Total {formatBRL(upcomingQuery.upcoming?.total)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Código {upcomingQuery.upcoming?.code}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button asChild className="min-h-11">
                          <Link href={`/conta/agendamentos?reagendar=1&appointmentId=${upcomingQuery.upcoming?.id}`}>Reagendar</Link>
                        </Button>
                        <Button asChild variant="outline" className="min-h-11">
                          <Link href={`/conta/agendamentos?cancelar=1&appointmentId=${upcomingQuery.upcoming?.id}`}>Cancelar</Link>
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

                  <RenderComponent condition={!upcomingQuery.upcoming}>
                    <EmptyState
                      title="Você ainda não tem um próximo horário"
                      description="Escolha um serviço e encontre um horário para sua próxima visita."
                      actionLabel="Agendar horário"
                      onAction={() => navigate('/agendar')}
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
                    <Button
                      className="min-h-11 w-full"
                      variant="outline"
                      disabled={!lastCutQuery.lastCut?.items.length}
                      onClick={() => lastCutQuery.lastCut && repeatAppointment(lastCutQuery.lastCut)}
                    >
                      <Scissors aria-hidden="true" />
                      {lastCutQuery.lastCut ? 'Repetir serviços e barbeiro' : 'Nenhum corte anterior'}
                    </Button>
                  </CardContent>
                </Card>
              </section>

              <RenderComponent condition={!upcomingQuery.upcoming && lastCutQuery.lastCut}>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="size-4" aria-hidden="true" />
                  Seu último atendimento foi em {formatDateTime(lastCutQuery.lastCut?.start)}.
                </p>
              </RenderComponent>
            </div>
          </RenderComponent>
        )}
      </Observer>
    </React.Fragment>
  );
}
