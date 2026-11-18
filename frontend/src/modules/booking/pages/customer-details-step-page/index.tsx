import { useEffect } from 'react';

import { BookingSummaryFooter } from '@/modules/booking/components/booking-summary-footer';

import { Countdown } from '@/shared/components/countdown';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { PhoneInput } from '@/shared/components/phone-input';
import { RenderComponent } from '@/shared/components/render-component';
import { formatDateTime } from '@/shared/lib/format';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

import { CalendarClock, Clock3, UserRound } from 'lucide-react';
import { observer, Observer } from 'mobx-react-lite';
import { useLocation } from 'wouter';

import { useBookingCustomerDetailsPage } from './useBookingCustomerDetailsPage';

function RenderSuccess() {
  const [, navigate] = useLocation();
  const bookingDraftStore = useBookingDraftStore();
  const { form, store, barbersQuery, estimateQuery, saveCustomer } = useBookingCustomerDetailsPage();

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Etapa 4 de 4"
        title="Seus dados"
        description="Informe ou confirme seus dados de contato para seguir para a revisão do agendamento."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Como podemos falar com você?</CardTitle>
            <CardDescription>Seu telefone deve incluir o DDD.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form id="booking-customer-details" onSubmit={form.handleSubmit(saveCustomer)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="name" maxLength={100} placeholder="Como devemos chamar você?" className="min-h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone ou WhatsApp</FormLabel>
                      <FormControl>
                        <PhoneInput
                          id="booking-customer-phone"
                          value={field.value}
                          onValueChange={field.onChange}
                          name={field.name}
                          aria-label="Telefone ou WhatsApp com DDD"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seu agendamento</CardTitle>
            <CardDescription>O horário fica reservado enquanto você conclui os próximos passos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Data e horário</p>
                <Observer>
                  {() => (
                    <p className="font-medium">
                      <RenderComponent condition={bookingDraftStore.date && bookingDraftStore.time}>
                        {formatDateTime(`${bookingDraftStore.date}T${bookingDraftStore.time}:00-03:00`)}
                      </RenderComponent>

                      <RenderComponent condition={!(bookingDraftStore.date && bookingDraftStore.time)}>{'—'}</RenderComponent>
                    </p>
                  )}
                </Observer>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Profissional</p>
                {barbersQuery.isPending ?
                  <Skeleton className="mt-1 h-5 w-36" aria-label="Carregando profissional" />
                : barbersQuery.isError ?
                  <div className="mt-2 space-y-2">
                    <p role="alert" className="text-sm text-destructive">
                      Não foi possível carregar o profissional selecionado.
                    </p>
                    <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => void barbersQuery.result.refetch()}>
                      Tentar novamente
                    </Button>
                  </div>
                : <Observer>
                    {() => {
                      const selectedBarber = barbersQuery.barbers.find((barber) => String(barber.id) === bookingDraftStore.barberId);

                      return <p className="font-medium">{selectedBarber?.name ?? 'Profissional selecionado'}</p>;
                    }}
                  </Observer>
                }
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Reserva temporária</p>
                <Observer>
                  {() => (
                    <Countdown
                      onExpire={() => store.setReservationExpired(true)}
                      expiresAt={bookingDraftStore.holdExpiresAt ?? ''}
                      className="font-medium"
                    />
                  )}
                </Observer>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">Duração estimada</p>
              {estimateQuery.isPending ?
                <Skeleton className="mt-1 h-5 w-28" aria-label="Carregando duração estimada" />
              : estimateQuery.isError ?
                <div className="mt-2 space-y-2">
                  <p role="alert" className="text-sm text-destructive">
                    Não foi possível carregar a estimativa deste agendamento.
                  </p>
                  <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => void estimateQuery.result.refetch()}>
                    Tentar novamente
                  </Button>
                </div>
              : <Observer>{() => <p className="font-medium">{store.durationLabel ?? '—'}</p>}</Observer>}
              <p className="mt-3 text-sm text-muted-foreground">Valor estimado</p>
              <Observer>
                {() => (
                  <RenderComponent condition={estimateQuery.isPending}>
                    <Skeleton className="mt-1 h-6 w-32" aria-label="Carregando valor estimado" />
                  </RenderComponent>
                )}
              </Observer>

              <Observer>
                {() => (
                  <RenderComponent condition={estimateQuery.isError}>
                    <p className="font-heading text-lg text-muted-foreground">Indisponível</p>
                  </RenderComponent>
                )}
              </Observer>
              <Observer>
                {() => (
                  <RenderComponent condition={estimateQuery.isSuccess}>
                    <p className="font-heading text-lg text-primary">{store.priceLabel ?? '—'}</p>
                  </RenderComponent>
                )}
              </Observer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate('/agendar/horario')}>
          Voltar ao horário
        </Button>
        <p className="text-sm text-muted-foreground">Seus dados serão usados para identificar este agendamento.</p>
      </div>

      <Observer>
        {() => (
          <BookingSummaryFooter
            actionLabel="Continuar para revisão"
            disabled={!store.hasActiveReservation || form.formState.isSubmitting}
            onContinue={() => form.handleSubmit(saveCustomer)()}
          />
        )}
      </Observer>
    </div>
  );
}

export default observer(() => {
  const [, navigate] = useLocation();
  const bookingStore = useBookingDraftStore();
  const reservationExpired =
    !bookingStore.holdExpiresAt || !Number.isFinite(Date.parse(bookingStore.holdExpiresAt)) || Date.parse(bookingStore.holdExpiresAt) <= Date.now();

  const hasReservationDetails = Boolean(
    bookingStore.serviceIds.length &&
    bookingStore.barberId &&
    bookingStore.date &&
    bookingStore.time &&
    bookingStore.holdKey &&
    bookingStore.holdExpiresAt,
  );
  const hasActiveReservation = hasReservationDetails && !reservationExpired;

  useEffect(() => {
    document.title = 'Seus dados | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Informe seus dados de contato para continuar com o agendamento.';
  }, []);

  useEffect(() => {
    if (!bookingStore.serviceIds.length) {
      navigate('/agendar');
      return;
    }
    if (hasActiveReservation) bookingStore.setStep('details');
  }, [bookingStore, hasActiveReservation, navigate]);

  if (!bookingStore.serviceIds.length) return <div className="min-h-48" aria-label="Voltando à escolha de serviços" />;

  function returnToSlotSelection() {
    bookingStore.setSlot(bookingStore.date, null, null);
    bookingStore.setStep('slot');
    navigate('/agendar/horario');
  }

  if (!hasActiveReservation) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Etapa 4 de 4" title="Seus dados" description="Informe seus dados de contato antes de revisar o agendamento." />
        <ErrorState
          title={reservationExpired ? 'Sua reserva expirou' : 'Escolha um horário primeiro'}
          description={
            reservationExpired ?
              'O horário temporário não está mais reservado. Escolha outro para continuar.'
            : 'Para informar seus dados, primeiro selecione e reserve um horário.'
          }
          onRetry={returnToSlotSelection}
          retryLabel="Escolher outro horário"
        />
      </div>
    );
  }

  return <RenderSuccess />;
});
