import React, { useEffect } from 'react';

import { AppointmentActionOverlays } from '@/modules/account/components/appointment-action-overlays';
import { useAccountAppointmentsPage } from '@/modules/account/hooks/use-account-appointments-page';

import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { AppointmentStatus, StatusBadge } from '@/shared/components/status-badge';
import { formatBRL, formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

import { CalendarDays, ChevronLeft, ChevronRight, Scissors, UserRound } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { Link } from 'wouter';

import type { AppointmentListView, CustomerAppointment } from '@/modules/account/api/appointments';
const views: Array<{ value: AppointmentListView; label: string }> = [
  { value: 'upcoming', label: 'Próximos' },
  { value: 'past', label: 'Passados' },
  { value: 'canceled', label: 'Cancelados' },
];

const apiStatusLabels: Record<string, AppointmentStatus> = {
  pending: 'agendado',
  confirmed: 'confirmado',
  checked_in: 'aguardando',
  in_service: 'em_atendimento',
  done: 'concluido',
  canceled: 'cancelado',
  no_show: 'no_show',
};

export default function AccountAppointmentsPage() {
  const store = useAccountAppointmentsPage();

  useEffect(() => {
    document.title = 'Meus agendamentos | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Consulte seus próximos horários, atendimentos passados e cancelamentos.';
  }, []);

  return (
    <React.Fragment>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Minha conta"
          title="Meus agendamentos"
          description="Acompanhe seus próximos horários e consulte seu histórico."
          actions={
            <Button asChild className="min-h-11">
              <Link href="/agendar">
                <CalendarDays aria-hidden="true" />
                Agendar novamente
              </Link>
            </Button>
          }
        />

        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <div className="space-y-2">
              <Label htmlFor="appointments-from">De</Label>
              <Observer>{() => <Input id="appointments-from" type="date" value={store.from} onChange={(event) => store.setFrom(event.target.value)} className="min-h-11" />}</Observer>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointments-to">Até</Label>
              <Observer>{() => <Input id="appointments-to" type="date" value={store.to} className="min-h-11" onChange={(event) => store.setTo(event.target.value)} />}</Observer>
            </div>
          </CardContent>
        </Card>

        <Observer>
          {() => (
            <Tabs value={store.view} onValueChange={(value) => store.setView(value as AppointmentListView)}>
              <TabsList className="grid h-auto w-full grid-cols-3 sm:w-[28rem]">
                {views.map((item) => (
                  <TabsTrigger key={item.value} value={item.value} className="min-h-11">
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {views.map((item) => (
                <TabsContent key={item.value} value={item.value} className="mt-5">
                  <RenderComponent condition={store.invalidRange}>
                    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                      A data inicial precisa ser anterior ou igual à data final.
                    </p>
                  </RenderComponent>

                  <RenderComponent condition={!store.invalidRange}>
                    <RenderComponent condition={store.isPending}>
                      <div className="space-y-3" aria-label="Carregando seus agendamentos">
                        {[0, 1, 2].map((item) => (
                          <Skeleton key={item} className="h-36 rounded-xl" />
                        ))}
                      </div>
                    </RenderComponent>

                    <RenderComponent condition={!store.isPending}>
                      <RenderComponent condition={store.isError}>
                        <ErrorState title="Não foi possível carregar os agendamentos" description="Confira sua conexão e tente novamente." onRetry={() => void store.refetch()} />
                      </RenderComponent>

                      <RenderComponent condition={!store.isError}>
                        <RenderComponent condition={store.total === 0}>
                          <EmptyState
                            title={
                              store.view === 'upcoming' ? 'Nenhum próximo agendamento'
                              : store.view === 'past' ?
                                'Nenhum atendimento passado'
                              : 'Nenhum agendamento cancelado'
                            }
                            description={store.view === 'upcoming' ? 'Quando você reservar um horário, ele aparecerá aqui.' : 'Não há agendamentos neste período.'}
                            actionLabel={store.view === 'upcoming' ? 'Agendar horário' : undefined}
                            onAction={store.view === 'upcoming' ? () => store.goToBooking() : undefined}
                          />
                        </RenderComponent>

                        <RenderComponent condition={store.total > 0}>
                          <div className="space-y-4">
                            <div className="space-y-3">
                              {store.appointments.map((appointment) => (
                                <AppointmentCard key={appointment.id} appointment={appointment} view={store.view} barbers={store.barbers} onRepeat={() => store.repeatAppointment(appointment)} />
                              ))}
                            </div>
                            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm text-muted-foreground" aria-live="polite">
                                Mostrando {store.rangeStart}–{store.rangeEnd} de {store.total}
                              </p>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" className="min-h-11" disabled={!store.canGoPrevious} onClick={() => store.goToPreviousPage()}>
                                  <ChevronLeft aria-hidden="true" />
                                  Anterior
                                </Button>
                                <span className="min-w-20 text-center text-sm" aria-label={`Página ${store.page} de ${store.totalPages}`}>
                                  {store.page} / {store.totalPages}
                                </span>
                                <Button variant="outline" className="min-h-11" disabled={!store.canGoNext} onClick={() => store.goToNextPage()}>
                                  Próxima
                                  <ChevronRight aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </RenderComponent>
                      </RenderComponent>
                    </RenderComponent>
                  </RenderComponent>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </Observer>
        <AppointmentActionOverlays />
      </div>
    </React.Fragment>
  );
}

interface AppointmentCardProps {
  appointment: CustomerAppointment;
  view: AppointmentListView;
  barbers: Array<{ id: number; name: string }>;
  onRepeat: () => void;
}

function AppointmentCard({ appointment, barbers, onRepeat, view }: AppointmentCardProps) {
  const barber = barbers.find((item) => item.id === appointment.barberId)?.name ?? 'Profissional';
  const services = appointment.items.map((item) => item.name).filter(Boolean);
  const status = apiStatusLabels[appointment.status] ?? appointment.status.replaceAll('_', ' ');

  return (
    <Card key={appointment.id} className="shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{formatDateTime(appointment.start)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Código {appointment.code}</p>
          </div>
          <StatusBadge kind="appointment" status={status} />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p className="flex items-start gap-2">
            <UserRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="text-muted-foreground">Barbeiro: </span>
              {barber}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <Scissors className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="text-muted-foreground">Serviços: </span>
              {services.length ? services.join(' · ') : 'Não informados'}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">Total {formatBRL(appointment.total)}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/conta/agendamentos/${appointment.id}`}>Ver detalhes</Link>
            </Button>

            <RenderComponent condition={view === 'past'}>
              <Button variant="outline" className="min-h-11" onClick={onRepeat}>
                <CalendarDays aria-hidden="true" />
                Agendar novamente
              </Button>
            </RenderComponent>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
