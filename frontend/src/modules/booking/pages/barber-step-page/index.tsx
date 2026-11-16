import React, { useEffect } from 'react';

import { BookingSummaryFooter } from '@/modules/booking/components/booking-summary-footer';
import { useAvailableBarbers } from '@/modules/booking/hooks/use-booking-data';

import { BarberCard } from '@/shared/components/barber-card';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { formatBRL, formatDateTime, formatDuration } from '@/shared/lib/format';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { ArrowLeft, CalendarClock, Star } from 'lucide-react';
import { reaction } from 'mobx';
import { Observer } from 'mobx-react-lite';
import { useLocation } from 'wouter';

import { useBookingBarberPage } from './useBookingBarberPage';

function RenderSuccess() {
  const [, navigate] = useLocation();
  const bookingDraftStore = useBookingDraftStore();
  const { store, chooseAny, chooseBarber, continueBooking } = useBookingBarberPage();
  const barbersQuery = useAvailableBarbers(() => ({ serviceIds: bookingDraftStore.serviceIds }));

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Etapa 2 de 4"
        title="Escolha seu profissional"
        description="Todos os profissionais abaixo atendem os serviços selecionados. Você pode deixar a escolha em aberto."
      />

      <Observer>
        {() => (
          <RenderComponent condition={barbersQuery.isPending}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Carregando profissionais">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-56 rounded-xl" />
              ))}
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={barbersQuery.isError}>
            <ErrorState description="Não foi possível consultar os profissionais e horários." onRetry={() => barbersQuery.result.refetch()} />
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={barbersQuery.isSuccess}>
            <RenderComponent condition={barbersQuery.barbers.length === 0}>
              <EmptyState
                title="Nenhum profissional atende esses serviços"
                description="Volte e ajuste os serviços selecionados para ver outras opções."
              />
            </RenderComponent>

            <RenderComponent condition={barbersQuery.barbers.length > 0}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <button
                  type="button"
                  onClick={chooseAny}
                  aria-pressed={store.selectedChoice === 'any'}
                  disabled={barbersQuery.availableBarbers.length === 0}
                  className="min-h-11 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Card className={`h-full transition-colors ${store.selectedChoice === 'any' ? 'border-primary ring-2 ring-primary/30' : ''}`}>
                    <CardContent className="flex min-h-48 flex-col items-start justify-between gap-5">
                      <div>
                        <Badge variant="secondary">Qualquer profissional</Badge>
                        <h2 className="mt-3 font-heading text-xl font-semibold">Sem preferência</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                          No próximo passo, mostraremos um horário disponível com um profissional que atende seus serviços.
                        </p>
                      </div>
                      <p className="flex items-center gap-2 text-sm font-medium text-primary">
                        <CalendarClock className="size-4" aria-hidden="true" />
                        {barbersQuery.availableBarbers.length > 0 ? 'Há horários disponíveis' : 'Sem horários próximos'}
                      </p>
                    </CardContent>
                  </Card>
                </button>

                {barbersQuery.barbers.map((barber) => {
                  const unavailable = !barber.nextSlot;
                  const availabilityText =
                    barber.nextSlot ? `Próximo horário: ${formatDateTime(barber.nextSlot.start)}` : 'Sem horários disponíveis nos próximos 30 dias';
                  const ratingText = typeof barber.rating === 'number' ? `${barber.rating.toFixed(1)} de 5` : 'Sem avaliações';

                  return (
                    <BarberCard
                      key={barber.id}
                      name={barber.name}
                      photoUrl={barber.photo ?? undefined}
                      specialties={barber.specialties}
                      availabilityText={availabilityText}
                      selected={store.selectedChoice === String(barber.id)}
                      disabled={unavailable}
                      onSelect={() => chooseBarber(barber.id)}
                      footer={
                        <div className="grid w-full gap-2 text-sm">
                          <p className="flex items-center gap-2 font-medium">
                            <Star className="size-4 text-primary" aria-hidden="true" />
                            {ratingText}
                          </p>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">{formatDuration(barber.totalDurationMin)}</span>
                            <span className="font-semibold">{formatBRL(barber.subtotal)}</span>
                          </div>
                          {unavailable && <p className="text-xs text-muted-foreground">Indisponível para seleção no momento.</p>}
                        </div>
                      }
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap justify-between gap-3 pb-2">
                <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => navigate('/agendar')}>
                  <ArrowLeft className="size-4" aria-hidden="true" /> Voltar aos serviços
                </Button>
              </div>
            </RenderComponent>
          </RenderComponent>
        )}
      </Observer>
      <Observer>{() => <BookingSummaryFooter actionLabel="Continuar" disabled={!store.canContinue} onContinue={continueBooking} />}</Observer>
    </div>
  );
}

export default function BookingBarberPage() {
  const [, navigate] = useLocation();
  const bookingDraftStore = useBookingDraftStore();

  useEffect(() => {
    const dispose = reaction(
      () => bookingDraftStore.serviceIds,
      (serviceIds) => {
        if (!serviceIds.length) {
          navigate('/agendar');
          return;
        }
      },
    );

    return () => dispose();
  }, [bookingDraftStore, navigate]);

  return (
    <React.Fragment>
      <Observer>
        {() => (
          <RenderComponent condition={bookingDraftStore.serviceIds.length === 0}>
            <div className="min-h-48" aria-label="Voltando à escolha de serviços" />
          </RenderComponent>
        )}
      </Observer>
      <Observer>
        {() => (
          <RenderComponent condition={bookingDraftStore.serviceIds.length > 0}>
            <RenderSuccess />
          </RenderComponent>
        )}
      </Observer>
    </React.Fragment>
  );
}
