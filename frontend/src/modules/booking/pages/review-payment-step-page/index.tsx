import React from 'react';

import { BookingSummaryFooter } from '@/modules/booking/components/booking-summary-footer';

import { Countdown } from '@/shared/components/countdown';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { formatDateTime } from '@/shared/lib/format';
import { HttpError } from '@/shared/lib/http';
import { FIXED_OFFSET } from '@/shared/lib/time';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Skeleton } from '@/shared/ui/skeleton';

import { CalendarClock, Clock3, CreditCard, Scissors, UserRound } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { Link, useLocation } from 'wouter';

import { useBookingReviewPaymentPage } from './useBookingReviewPaymentPage';

export default function BookingReviewPaymentPage() {
  const [, navigate] = useLocation();
  const bookingStore = useBookingDraftStore();
  const state = useBookingReviewPaymentPage();

  return (
    <React.Fragment>
      <Observer>
        {() => (
          <RenderComponent condition={!bookingStore.serviceIds.length}>
            <div className="min-h-48" aria-label="Voltando à escolha de serviços" />
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={!bookingStore.hasBookingDetails}>
            <div className="space-y-6">
              <PageHeader title="Revisar agendamento" description="Confira os detalhes antes de confirmar." />
              <ErrorState
                retryLabel="Voltar aos seus dados"
                title="Complete os dados do agendamento"
                onRetry={() => navigate('/agendar/dados')}
                description="Volte à etapa anterior para escolher e reservar um horário e informar seus dados."
              />
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={state.store.reservationExpired}>
            <div className="space-y-6">
              <PageHeader title="Revisar agendamento" description="A reserva temporária é necessária para confirmar este horário." />
              <ErrorState
                title="Sua reserva expirou"
                description="Escolha outro horário para continuar com o agendamento."
                onRetry={() => state.returnToAvailability()}
                retryLabel="Escolher outro horário"
              />
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={state.store.hasQueryError}>
            <div className="space-y-6">
              <PageHeader title="Revisar agendamento" description="Não foi possível carregar todos os dados necessários para a revisão." />
              <ErrorState description="Confira sua conexão e tente carregar novamente antes de confirmar." onRetry={state.retryQueries} />
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={!(!bookingStore.serviceIds.length && !bookingStore.hasBookingDetails && state.store.reservationExpired && state.store.hasQueryError)}>
            <RenderSuccess state={state} />
          </RenderComponent>
        )}
      </Observer>
    </React.Fragment>
  );
}

function RenderSuccess({ state }: { state: ReturnType<typeof useBookingReviewPaymentPage> }) {
  const [, navigate] = useLocation();
  const bookingStore = useBookingDraftStore();
  const { store, form, bookingMutation, policyQuery, serviceCatalogQuery } = state;

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Revisão final" title="Revise seu agendamento" description="Confira todos os dados antes de confirmar seu horário." />

      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Resumo do agendamento</CardTitle>
            <CardDescription>Os valores finais serão recalculados pelo servidor ao confirmar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <section aria-labelledby="review-services-title">
              <h2 id="review-services-title" className="mb-2 flex items-center gap-2 text-base font-semibold">
                <Scissors className="size-4 text-primary" aria-hidden="true" />
                Serviços
              </h2>

              <Observer>
                {() => (
                  <RenderComponent condition={store.isLoading}>
                    <div className="space-y-2" aria-label="Carregando serviços">
                      {Array.from({ length: Math.max(bookingStore.serviceIds.length, 1) }, (_, index) => (
                        <Skeleton key={index} className="h-5 w-2/3" />
                      ))}
                    </div>
                  </RenderComponent>
                )}
              </Observer>
              <Observer>
                {() => (
                  <RenderComponent condition={!store.isLoading}>
                    <ul className="space-y-1 text-sm">
                      {serviceCatalogQuery.services.map((service) => (
                        <li key={service.id}>{service.name}</li>
                      ))}
                    </ul>
                  </RenderComponent>
                )}
              </Observer>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm text-muted-foreground">Profissional</p>

                  <Observer>
                    {() => (
                      <RenderComponent condition={store.isLoading}>
                        <Skeleton className="mt-1 h-5 w-32" />
                      </RenderComponent>
                    )}
                  </Observer>

                  <Observer>
                    {() => (
                      <RenderComponent condition={!store.isLoading}>
                        <p className="font-medium">{store.barber?.name ?? '—'}</p>
                      </RenderComponent>
                    )}
                  </Observer>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm text-muted-foreground">Data e horário</p>
                  <Observer>
                    {() => (
                      <p className="font-medium">
                        <RenderComponent condition={bookingStore.date && bookingStore.time}>{formatDateTime(`${bookingStore.date}T${bookingStore.time}:00${FIXED_OFFSET}`)}</RenderComponent>
                        <RenderComponent condition={!(bookingStore.date && bookingStore.time)}>{'—'}</RenderComponent>
                      </p>
                    )}
                  </Observer>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <Observer>
                  {() => (
                    <div>
                      <p className="text-sm text-muted-foreground">Duração estimada</p>

                      <RenderComponent condition={store.isLoading}>
                        <Skeleton className="mt-1 h-5 w-24" />
                      </RenderComponent>

                      <RenderComponent condition={!store.isLoading}>
                        <p className="font-medium">{store.durationLabel}</p>
                      </RenderComponent>
                    </div>
                  )}
                </Observer>
              </div>

              <Observer>
                {() => (
                  <div>
                    <p className="text-sm text-muted-foreground">Total estimado</p>

                    <RenderComponent condition={store.isLoading}>
                      <Skeleton className="mt-1 h-6 w-28" />
                    </RenderComponent>

                    <RenderComponent condition={!store.isLoading}>
                      <p className="font-heading text-xl font-semibold text-primary">{store.priceLabel}</p>
                    </RenderComponent>
                  </div>
                )}
              </Observer>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Pagar na barbearia</p>
                  <p className="mt-1 text-sm text-muted-foreground">O pagamento será feito presencialmente após o atendimento.</p>
                </div>
              </div>
            </div>

            <Observer>
              {() => (
                <RenderComponent condition={store.submitError}>
                  <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm" role="alert">
                    <p className="text-destructive">{store.submitError}</p>

                    <RenderComponent condition={store.suggestedSlot}>
                      <p>Próxima opção: {formatDateTime(store.suggestedSlot?.start || '')}.</p>
                    </RenderComponent>

                    <RenderComponent condition={store.accountConflict}>
                      <Button asChild type="button" variant="outline" className="min-h-11">
                        <Link href="/entrar">Entrar na minha conta</Link>
                      </Button>
                    </RenderComponent>

                    <RenderComponent condition={store.suggestedSlot || (bookingMutation.error instanceof HttpError && bookingMutation.error.status === 409)}>
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => state.returnToAvailability()}>
                        Ver horários disponíveis
                      </Button>
                    </RenderComponent>

                    <RenderComponent condition={!(store.suggestedSlot || (bookingMutation.error instanceof HttpError && bookingMutation.error.status === 409))}>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        disabled={!store.canConfirm || bookingMutation.isLoading}
                        onClick={() => void form.handleSubmit(state.confirmBooking)()}
                      >
                        Tentar novamente
                      </Button>
                    </RenderComponent>
                  </div>
                </RenderComponent>
              )}
            </Observer>

            <Form {...form}>
              <form id="booking-review-consent" onSubmit={form.handleSubmit(state.confirmBooking)}>
                <FormField
                  control={form.control}
                  name="policyAccepted"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 rounded-lg border border-border p-4">
                      <FormControl>
                        <Checkbox
                          id="booking-policy-accepted"
                          checked={field.value}
                          onCheckedChange={(value) => field.onChange(value === true)}
                          aria-invalid={Boolean(form.formState.errors.policyAccepted)}
                        />
                      </FormControl>
                      <Observer>
                        {() => (
                          <div className="space-y-1">
                            <FormLabel htmlFor="booking-policy-accepted" className="cursor-pointer leading-relaxed">
                              Estou ciente da política de cancelamento:{' '}
                              <RenderComponent condition={policyQuery.policy?.cancelBeforeHours === 0}>{'posso solicitar o cancelamento a qualquer momento antes do atendimento.'}</RenderComponent>
                              <RenderComponent condition={policyQuery.policy?.cancelBeforeHours !== 0}>
                                {`solicite o cancelamento com pelo menos ${policyQuery.policy?.cancelBeforeHours ?? '—'} horas de antecedência.`}
                              </RenderComponent>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        )}
                      </Observer>
                    </FormItem>
                  )}
                />
              </form>
            </Form>

            <Observer>
              {() => (
                <RenderComponent condition={store.isLoading}>
                  <p role="status" className="text-sm text-muted-foreground">
                    Carregando os dados da revisão…
                  </p>
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={bookingMutation.isLoading}>
                  <p role="status" className="text-sm text-muted-foreground">
                    Confirmando seu horário…
                  </p>
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.hasActiveReservation && bookingStore.holdExpiresAt}>
                  <p className="text-sm text-muted-foreground">
                    <Countdown expiresAt={bookingStore.holdExpiresAt || ''} onExpire={() => store.setReservationExpired(true)} />
                  </p>
                </RenderComponent>
              )}
            </Observer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Política de cancelamento</CardTitle>
            <CardDescription>Confira antes de confirmar o agendamento.</CardDescription>
          </CardHeader>
          <Observer>
            {() => (
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <RenderComponent condition={policyQuery.isPending}>
                  <Skeleton className="h-12 w-full" aria-label="Carregando política de cancelamento" />
                </RenderComponent>

                <RenderComponent condition={policyQuery.isSuccess}>
                  <p>
                    <RenderComponent condition={policyQuery.policy?.cancelBeforeHours === 0}>
                      {'Entre em contato com a barbearia antes do horário reservado para solicitar o cancelamento.'}
                    </RenderComponent>

                    <RenderComponent condition={policyQuery.policy?.cancelBeforeHours !== 0}>
                      {`Cancelamentos devem ser solicitados com pelo menos ${policyQuery.policy?.cancelBeforeHours ?? '—'} horas de antecedência do atendimento.`}
                    </RenderComponent>
                  </p>
                </RenderComponent>
                <p>O horário permanece reservado por tempo limitado. Se a reserva expirar ou houver conflito, será necessário escolher outro horário.</p>
              </CardContent>
            )}
          </Observer>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate('/agendar/dados')}>
          Voltar aos seus dados
        </Button>
        <p className="text-sm text-muted-foreground">A confirmação não exige pagamento online.</p>
      </div>

      <Observer>
        {() => (
          <BookingSummaryFooter
            disabled={!store.canConfirm || bookingMutation.isLoading}
            onContinue={() => form.handleSubmit(state.confirmBooking)()}
            actionLabel={bookingMutation.isLoading ? 'Confirmando…' : 'Confirmar agendamento'}
          />
        )}
      </Observer>
    </div>
  );
}
