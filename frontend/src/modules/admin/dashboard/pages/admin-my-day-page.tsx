import { useEffect } from 'react';

import { useMyDayAppointments, useMyDayCommissions, useUpdateMyDayAppointment } from '@/modules/admin/dashboard/hooks/use-my-day';

import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { StatusBadge } from '@/shared/components/status-badge';
import { formatBRL, formatDate, formatDateTime } from '@/shared/lib/format';
import { BUSINESS_TIME_ZONE } from '@/shared/lib/time';
import { sessionStore } from '@/shared/stores/session-store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { CalendarCheck2, CircleDollarSign, Clock3, Play, UserCheck } from 'lucide-react';
import { reaction } from 'mobx';
import { Observer, useLocalObservable } from 'mobx-react-lite';

function todayInBusinessTimeZone() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(new Date());
}

const statusLabels: Record<string, string> = {
  pending: 'agendado',
  confirmed: 'confirmado',
  checked_in: 'aguardando',
  in_service: 'em_atendimento',
  done: 'concluido',
  canceled: 'cancelado',
  no_show: 'no_show',
};

export default function AdminMyDayPage() {
  const date = todayInBusinessTimeZone();
  const commissionParams = useLocalObservable(() => ({
    date: date,
    canReadCommissions: false,
    setCanReadCommissions(value: boolean) {
      this.canReadCommissions = value;
    },
  }));
  const appointmentsQuery = useMyDayAppointments(date);
  const updateAppointment = useUpdateMyDayAppointment();
  const commissionsQuery = useMyDayCommissions(commissionParams);

  useEffect(() => {
    document.title = 'Meu dia | Painel administrativo';
    const dispose = reaction(
      () => sessionStore.user,
      (user) => {
        const canReadCommissions =
          user?.role === 'barber' || user?.role === 'manager' || user?.role === 'admin' || user?.permissions.includes('commissions.read');

        commissionParams.setCanReadCommissions(Boolean(canReadCommissions));
      },
    );

    return () => dispose();
  }, [commissionParams]);

  function updateStatus(id: number, status: 'checked_in' | 'in_service') {
    updateAppointment.mutate({ id, status });
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Painel administrativo" title="Meu dia" description={formatDate(date, "EEEE, dd 'de' MMMM")} />

      <Observer>
        {() => (
          <RenderComponent condition={commissionParams.canReadCommissions}>
            <section aria-label="Resumo de comissões do dia" className="space-y-3">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Comissões de hoje</h2>
              </div>
              <RenderComponent condition={commissionsQuery.isError}>
                <ErrorState title="Não foi possível carregar as comissões" onRetry={() => void commissionsQuery.queryResult.refetch()} />
              </RenderComponent>

              <RenderComponent condition={commissionsQuery.isPending}>
                <div className="grid gap-3 sm:grid-cols-3">
                  {['Total', 'Pendente', 'Pago'].map((label) => (
                    <Skeleton key={label} className="h-28 rounded-xl" aria-label={`Carregando comissão ${label.toLowerCase()}`} />
                  ))}
                </div>
              </RenderComponent>

              <RenderComponent condition={commissionsQuery.isSuccess}>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Total do dia', cents: commissionsQuery.commissions?.totalCents ?? 0 },
                    { label: 'Pendente', cents: commissionsQuery.commissions?.pendingCents ?? 0 },
                    { label: 'Pago', cents: commissionsQuery.commissions?.paidCents ?? 0 },
                  ].map((item) => (
                    <Card key={item.label}>
                      <CardHeader className="pb-2">
                        <CardDescription>{item.label}</CardDescription>
                        <CardTitle className="text-2xl tabular-nums">{formatBRL(item.cents)}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </RenderComponent>
            </section>
          </RenderComponent>
        )}
      </Observer>

      <section aria-label="Atendimentos de hoje" className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Atendimentos</h2>
        </div>

        <Observer>
          {() => (
            <RenderComponent condition={appointmentsQuery.isError}>
              <ErrorState
                title="Não foi possível carregar seus atendimentos"
                description="Confira sua conexão e tente novamente."
                onRetry={() => void appointmentsQuery.queryResult.refetch()}
              />
            </RenderComponent>
          )}
        </Observer>

        <Observer>
          {() => (
            <RenderComponent condition={appointmentsQuery.isPending}>
              <div className="space-y-3" aria-label="Carregando atendimentos">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-52 rounded-xl" />
                ))}
              </div>
            </RenderComponent>
          )}
        </Observer>

        <Observer>
          {() => (
            <RenderComponent condition={appointmentsQuery.isSuccess}>
              <RenderComponent condition={appointmentsQuery.appointments?.length}>
                <ol className="space-y-3">
                  {appointmentsQuery.appointments.map((appointment) => (
                    <li key={appointment.id}>
                      <Card>
                        <CardContent className="space-y-4 p-4 sm:p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 font-semibold tabular-nums">
                              <Clock3 className="size-4 text-primary" aria-hidden="true" />
                              <time dateTime={appointment.start}>
                                {formatDateTime(appointment.start).split(' às ')[1] ?? formatDateTime(appointment.start)}
                              </time>
                            </div>
                            <StatusBadge kind="appointment" status={statusLabels[appointment.status] ?? appointment.status} />
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Cliente</p>
                              <p className="truncate font-medium">{appointment.customerName}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Serviços</p>
                              <p className="font-medium">{appointment.items.map((item) => item.name).join(' · ') || 'Serviços não informados'}</p>
                            </div>

                            <RenderComponent condition={sessionStore.user?.role !== 'barber'}>
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Barbeiro</p>
                                <p className="truncate font-medium">{appointment.barberName}</p>
                              </div>
                            </RenderComponent>

                            <div className="min-w-0 sm:col-span-2">
                              <p className="text-xs text-muted-foreground">Observações</p>
                              <p className="wrap-break-word text-sm">{appointment.notes.trim() || 'Sem observações.'}</p>
                            </div>
                          </div>

                          <RenderComponent condition={appointment.status === 'confirmed' || appointment.status === 'checked_in'}>
                            <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row">
                              <RenderComponent condition={appointment.status === 'confirmed'}>
                                <Button
                                  className="min-h-11 w-full sm:w-auto"
                                  disabled={updateAppointment.isLoading}
                                  onClick={() => updateStatus(appointment.id, 'checked_in')}
                                >
                                  <UserCheck className="size-4" aria-hidden="true" />
                                  Cliente chegou
                                </Button>
                              </RenderComponent>

                              <RenderComponent condition={appointment.status === 'checked_in'}>
                                <Button
                                  className="min-h-11 w-full sm:w-auto"
                                  disabled={updateAppointment.isLoading}
                                  onClick={() => updateStatus(appointment.id, 'in_service')}
                                >
                                  <Play className="size-4" aria-hidden="true" />
                                  Iniciar atendimento
                                </Button>
                              </RenderComponent>
                            </div>
                          </RenderComponent>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ol>
              </RenderComponent>

              <RenderComponent condition={appointmentsQuery.appointments?.length === 0}>
                <EmptyState
                  title="Você não tem atendimentos hoje"
                  description="Aproveite sua folga. Quando houver horários agendados, eles aparecerão aqui."
                />
              </RenderComponent>
            </RenderComponent>
          )}
        </Observer>
      </section>
    </div>
  );
}
