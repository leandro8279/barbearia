import React from 'react';

import {
    AppointmentActionOverlays
} from '@/modules/account/components/appointment-action-overlays';

import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { StatusBadge } from '@/shared/components/status-badge';
import { formatBRL, formatDateTime, formatDuration } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { CalendarDays, Clock3, CreditCard, Scissors, UserRound } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { Link } from 'wouter';

import {
    downloadCalendarEvent, useAccountAppointmentDetailPage
} from './useAccountAppointmentDetailPage';

export default function AccountAppointmentDetailPage() {
  const page = useAccountAppointmentDetailPage();

  if (!page.state.validId) {
    return <ErrorState title="Agendamento não encontrado" description="Confira o endereço ou volte para sua lista de agendamentos." />;
  }

  return (
    <React.Fragment>
      <Observer>
        {() => (
          <RenderComponent condition={page.store.isPending}>
            <div className="space-y-6" aria-label="Carregando detalhes do agendamento">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-56 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={page.store.isError}>
            <ErrorState title="Não foi possível carregar este agendamento" description="Ele pode não existir ou não estar vinculado à sua conta." onRetry={page.actions.retry} />
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={page.store.isSuccess}>
            <AccountAppointmentDetail {...page} />
          </RenderComponent>
        )}
      </Observer>
    </React.Fragment>
  );
}

type Props = ReturnType<typeof useAccountAppointmentDetailPage>;

const paymentMethods: Record<string, string> = { cash: 'Dinheiro', pix: 'Pix', credit: 'Cartão de crédito', debit: 'Cartão de débito' };

const eventLabels: Record<string, string> = {
  created: 'Agendamento criado',
  confirmed: 'Agendamento confirmado',
  rescheduled: 'Agendamento reagendado',
  checked_in: 'Cliente chegou',
  in_service: 'Atendimento iniciado',
  done: 'Atendimento concluído',
  canceled: 'Agendamento cancelado',
  no_show: 'Cliente não compareceu',
  items_updated: 'Serviços atualizados',
};

function AccountAppointmentDetail(props: Props) {
  const { actions, store } = props;
  return (
    <div className="space-y-6">
      <Observer>
        {() => (
          <PageHeader
            eyebrow="Minha conta"
            title="Detalhe do agendamento"
            description={`Código ${store.appointment?.code} · ${formatDateTime(store.appointment?.start || '')}`}
            actions={
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/conta/agendamentos">Voltar aos agendamentos</Link>
              </Button>
            }
          />
        )}
      </Observer>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-primary/5">
          <div>
            <p className="text-sm text-muted-foreground">Resumo do horário</p>
            <Observer>{() => <CardTitle className="mt-1 text-xl">{formatDateTime(store.appointment?.start ?? '')}</CardTitle>}</Observer>
          </div>
          <Observer>{() => <StatusBadge kind="appointment" status={store.status} />}</Observer>
        </CardHeader>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Barbeiro</p>
                <Observer>{() => <p className="mt-1 font-medium">{store.appointment?.barber.name}</p>}</Observer>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Duração</p>
                <Observer>{() => <p className="mt-1 font-medium">{formatDuration(store.appointment?.items.reduce((total, item) => total + item.durationMin, 0) || 0)}</p>}</Observer>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Observer>
              {() => (
                <RenderComponent condition={store.canReschedule}>
                  <Button className="min-h-11" onClick={() => actions.rescheduleOverlay()}>
                    Reagendar
                  </Button>
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.canCancel}>
                  <Button variant="outline" className="min-h-11" onClick={() => actions.cancelOverlay()}>
                    Cancelar
                  </Button>
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <Button variant="outline" className="min-h-11" onClick={() => downloadCalendarEvent(store.appointment)}>
                  <CalendarDays aria-hidden="true" />
                  Adicionar ao calendário
                </Button>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={!store.canReschedule && !store.canCancel}>
                  <p className="self-center text-sm text-muted-foreground">As ações de alteração não estão disponíveis para este status.</p>
                </RenderComponent>
              )}
            </Observer>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scissors className="size-5 text-primary" aria-hidden="true" />
              Serviços e valores
            </CardTitle>
          </CardHeader>

          <Observer>
            {() => (
              <CardContent className="space-y-4">
                {store.appointment.items.map((item) => (
                  <div key={`${store.appointment.id}-${item.serviceId}`} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{formatDuration(item.durationMin)}</p>
                    </div>
                    <p className="shrink-0 font-medium">{formatBRL(item.price)}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border pt-3 font-semibold">
                  <span>Total</span>
                  <span>{formatBRL(store.appointment.total)}</span>
                </div>
              </CardContent>
            )}
          </Observer>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="size-5 text-primary" aria-hidden="true" />
              Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Observer>
              {() => (
                <RenderComponent condition={store.appointment.payments.length > 0}>
                  {store.appointment.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        {paymentMethods[payment.method] ?? payment.method} · {payment.status === 'paid' ? 'Pago' : payment.status}
                      </span>
                      <span className="font-medium">{formatBRL(payment.amountCents)}</span>
                    </div>
                  ))}
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.appointment.payments.length === 0}>
                  <p className="text-sm text-muted-foreground">Ainda não há pagamento registrado para este agendamento.</p>
                </RenderComponent>
              )}
            </Observer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <Observer>{() => <RenderComponent condition={store.appointment.notes?.trim() || ''}>Nenhuma observação registrada.</RenderComponent>}</Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.appointment.canceledReason}>
                  <p className="mt-3">
                    <span className="font-medium text-foreground">Motivo do cancelamento:</span> {store.appointment.canceledReason}
                  </p>
                </RenderComponent>
              )}
            </Observer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Linha do tempo</CardTitle>
          </CardHeader>

          <Observer>
            {() => (
              <CardContent>
                <RenderComponent condition={store.events.length > 0}>
                  <ol className="space-y-4">
                    {store.events.map((event, index) => (
                      <li key={`${event.at}-${event.type}-${index}`} className="relative flex gap-3">
                        <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="font-medium">{eventLabels[event.type] ?? event.type.replaceAll('_', ' ')}</p>
                          <time className="text-sm text-muted-foreground" dateTime={event.at}>
                            {formatDateTime(event.at)}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ol>
                </RenderComponent>

                <RenderComponent condition={store.events.length === 0}>
                  <EmptyState title="Sem atualizações" description="As mudanças deste agendamento aparecerão aqui." />
                </RenderComponent>
              </CardContent>
            )}
          </Observer>
        </Card>
      </div>

      <Observer>{() => <AppointmentActionOverlays appointment={store.appointment} />}</Observer>
    </div>
  );
}
