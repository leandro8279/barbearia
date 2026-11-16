import React, { useEffect } from 'react';

import { BookingSummaryFooter } from '@/modules/booking/components/booking-summary-footer';

import { Countdown } from '@/shared/components/countdown';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { SlotGrid } from '@/shared/components/slot-grid';
import { formatDate, formatDateTime, shiftMonth } from '@/shared/lib/format';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { CalendarClock, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { reaction } from 'mobx';
import { Observer } from 'mobx-react-lite';
import { useLocation } from 'wouter';

import { currentBusinessMonth, useBookingSlotPage } from './useBookingSlotPage';

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function RenderSuccess() {
  const bookingDraftStore = useBookingDraftStore();
  const { store, daysQuery, slotsQuery, createHoldMutation, ...state } = useBookingSlotPage();

  return (
    <div className="space-y-7">
      <Observer>
        {() => (
          <PageHeader
            eyebrow="Etapa 3 de 4"
            title="Escolha data e horário"
            description={
              bookingDraftStore.barberId ?
                `Veja os horários disponíveis para ${store.heldBarber ?? 'o profissional escolhido'}.`
              : 'Veja os horários de todos os profissionais que atendem seus serviços.'
            }
          />
        )}
      </Observer>

      <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section aria-labelledby="available-days-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="available-days-title" className="font-heading text-xl font-semibold">
              Dias disponíveis
            </h2>
            <div className="flex gap-1">
              <Observer>
                {() => (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Mês anterior"
                    className="min-h-11 min-w-11"
                    onClick={() => store.setMonth(shiftMonth(store.month, -1))}
                    disabled={store.month <= currentBusinessMonth() || store.isBusy}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </Observer>
              <Observer>
                {() => (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11"
                    aria-label="Próximo mês"
                    disabled={store.isBusy}
                    onClick={() => store.setMonth(shiftMonth(store.month, 1))}
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </Observer>
            </div>
          </div>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <Observer>
                {() => (
                  <p className="mb-4 text-center font-medium capitalize" aria-live="polite">
                    {store.headingMonth}
                  </p>
                )}
              </Observer>

              <Observer>
                {() => (
                  <RenderComponent condition={daysQuery.isPending}>
                    <div className="grid grid-cols-7 gap-1" aria-label="Carregando dias disponíveis">
                      {Array.from({ length: 35 }, (_, index) => (
                        <Skeleton key={index} className="h-11 rounded-md" />
                      ))}
                    </div>
                  </RenderComponent>
                )}
              </Observer>

              <Observer>
                {() => (
                  <RenderComponent condition={daysQuery.isError}>
                    <ErrorState description="Não foi possível carregar as datas disponíveis." onRetry={() => void daysQuery.result.refetch()} />
                  </RenderComponent>
                )}
              </Observer>

              <Observer>
                {() => (
                  <RenderComponent condition={daysQuery.isSuccess}>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                      {weekdays.map((day) => (
                        <span key={day} className="py-2">
                          {day}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1" role="group" aria-label="Dias disponíveis" data-booking-calendar>
                      {Array.from({ length: store.leadingDays }, (_, index) => (
                        <span key={`blank-${index}`} aria-hidden="true" />
                      ))}
                      {daysQuery.days.map((day, index) => {
                        const isSelected = bookingDraftStore.date === day.date;
                        return (
                          <Button
                            key={day.date}
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            className={`h-12 min-h-11 flex-col gap-0 p-1 ${!day.available ? 'text-muted-foreground' : ''}`}
                            aria-pressed={isSelected}
                            aria-label={`${formatDate(day.date, 'EEEE, dd MMMM')}${day.available ? `, ${day.slotsCount} horários disponíveis` : ', sem horários'}`}
                            tabIndex={day.date === store.focusDate ? 0 : -1}
                            data-calendar-index={store.leadingDays + index}
                            disabled={!day.available || store.isBusy}
                            onFocus={() => store.setFocusedDate(day.date)}
                            onKeyDown={state.handleCalendarDayKeyDown}
                            onClick={() => {
                              store.setFocusedDate(day.date);
                              state.chooseDate(day.date);
                            }}
                          >
                            <span>{Number(day.date.slice(-2))}</span>
                            {day.available && <span className="text-[10px] opacity-80">{day.slotsCount}</span>}
                          </Button>
                        );
                      })}
                    </div>
                    <RenderComponent condition={daysQuery.days.every((day) => !day.available)}>
                      <p className="mt-4 text-center text-sm text-muted-foreground">Não há horários neste mês. Tente outra data.</p>
                    </RenderComponent>
                  </RenderComponent>
                )}
              </Observer>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">O número abaixo de cada dia indica quantos horários ainda estão disponíveis.</p>
        </section>

        <section aria-labelledby="available-times-title" className="space-y-4">
          <div>
            <h2 id="available-times-title" className="font-heading text-xl font-semibold">
              Horários
            </h2>
            <Observer>
              {() => (
                <p className="mt-1 text-sm text-muted-foreground">
                  {bookingDraftStore.date ? formatDate(bookingDraftStore.date, 'EEEE, dd de MMMM') : 'Selecione um dia para consultar os horários.'}
                </p>
              )}
            </Observer>
          </div>

          <Observer>
            {() => (
              <RenderComponent condition={!!store.holdNotice}>
                <p role="status" aria-live="polite" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  {store.holdNotice}
                </p>
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={!!store.holdError}>
                <p
                  role="alert"
                  aria-live="assertive"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {store.holdError}
                </p>
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={store.hasStoredHold}>
                <Card className="border-primary/50">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">Horário reservado</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          <RenderComponent condition={bookingDraftStore.date}>
                            {formatDateTime(`${bookingDraftStore.date}T${bookingDraftStore.time}:00-03:00`)}
                          </RenderComponent>
                          <RenderComponent condition={!bookingDraftStore.date}>{bookingDraftStore.time}</RenderComponent>
                        </p>

                        <RenderComponent condition={store.heldBarber}>
                          <p className="mt-1 text-sm text-muted-foreground">Profissional: {store.heldBarber}</p>
                        </RenderComponent>
                      </div>
                      <Clock3 className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    </div>
                    <RenderComponent condition={bookingDraftStore.holdExpiresAt}>
                      <Countdown
                        onExpire={state.handleHoldExpired}
                        expiresAt={bookingDraftStore.holdExpiresAt || ''}
                        className="block text-sm font-medium text-primary"
                      />
                    </RenderComponent>
                    <Button type="button" variant="outline" className="min-h-11" disabled={store.isBusy} onClick={() => state.releaseCurrentHold()}>
                      Liberar horário
                    </Button>
                  </CardContent>
                </Card>
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={!bookingDraftStore.date}>
                <EmptyState
                  title="Escolha um dia"
                  description="As opções de horário aparecerão aqui depois que você selecionar uma data disponível."
                />
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={slotsQuery.isPending}>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Carregando horários">
                  {Array.from({ length: 8 }, (_, index) => (
                    <Skeleton key={index} className="h-11 rounded-md" />
                  ))}
                </div>
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={slotsQuery.isError}>
                <ErrorState description="Não foi possível consultar os horários deste dia." onRetry={() => void slotsQuery.result.refetch()} />
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={slotsQuery.isSuccess}>
                <SlotGrid
                  slots={store.slotOptions.slots}
                  selectedTime={store.activeHold ? null : bookingDraftStore.time}
                  onSelect={state.chooseTime}
                  emptyMessage={
                    store.activeHold ? 'Escolha outro horário ou continue com a reserva atual.' : 'Não há horários para esta data. Escolha outro dia.'
                  }
                />
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={createHoldMutation.isLoading}>
                <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
                  Reservando o horário por cinco minutos…
                </p>
              </RenderComponent>
            )}
          </Observer>
        </section>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarClock className="size-4" aria-hidden="true" />
        <Observer>
          {() => <RenderComponent condition={bookingDraftStore.barberId}>A reserva temporária mantém seu horário por cinco minutos.</RenderComponent>}
        </Observer>
        <Observer>
          {() => (
            <RenderComponent condition={!bookingDraftStore.barberId}>
              Ao escolher um horário, o profissional correspondente será definido automaticamente.
            </RenderComponent>
          )}
        </Observer>
      </div>

      <Observer>{() => <BookingSummaryFooter actionLabel="Continuar" disabled={!store.activeHold} onContinue={state.continueBooking} />}</Observer>
    </div>
  );
}

export default function BookingSlotPage() {
  const [, navigate] = useLocation();
  const bookingDraftStore = useBookingDraftStore();

  useEffect(() => {
    document.title = 'Escolher data e horário | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Escolha um dia e reserve temporariamente um horário para seu agendamento.';
  }, []);

  useEffect(() => {
    const dispose = reaction(
      () => bookingDraftStore.serviceIds,
      (serviceIds) => {
        if (!serviceIds.length) navigate('/agendar');
      },
    );

    return dispose;
  }, [navigate, bookingDraftStore]);

  return (
    <React.Fragment>
      <Observer>
        {() => (
          <RenderComponent condition={!bookingDraftStore.serviceIds.length}>
            <div className="min-h-48" aria-label="Voltando à escolha de serviços" />
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={bookingDraftStore.serviceIds.length}>
            <RenderSuccess />
          </RenderComponent>
        )}
      </Observer>
    </React.Fragment>
  );
}
