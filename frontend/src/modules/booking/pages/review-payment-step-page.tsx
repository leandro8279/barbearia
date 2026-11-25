import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { CalendarClock, Clock3, CreditCard, Scissors, UserRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { createGuestSession } from '@/modules/auth/api/auth';
import { BookingSummaryFooter } from '@/modules/booking/components/booking-summary-footer';
import { createAppointment, deleteSlotHold } from '@/modules/booking/api/booking';
import { useAvailableBarbers, useBookingEstimate, useBookingPolicy } from '@/modules/booking/hooks/use-booking-data';
import { usePublicServiceCatalog } from '@/modules/site/hooks/use-public-service-catalog';
import { bookingReviewSchema, type BookingReviewValues } from '@/modules/booking/schemas/booking-review.schema';
import { Countdown } from '@/shared/components/countdown';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { HttpError } from '@/shared/lib/http';
import { formatBRL, formatDateTime, formatDuration } from '@/shared/lib/format';
import { BUSINESS_TIME_ZONE, FIXED_OFFSET } from '@/shared/lib/time';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { useSessionStore } from '@/shared/stores/session-store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Skeleton } from '@/shared/ui/skeleton';

interface SuggestedSlot {
  barberId: number;
  start: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function serverErrorMessage(error: unknown): string {
  if (error instanceof HttpError && isRecord(error.details) && typeof error.details.error === 'string') return error.details.error;
  return error instanceof Error && error.message ? error.message : 'Não foi possível confirmar o agendamento. Tente novamente.';
}

function suggestedSlotFromError(error: unknown): SuggestedSlot | null {
  if (!(error instanceof HttpError) || error.status !== 409 || !isRecord(error.details) || !isRecord(error.details.details)) return null;
  const slot = error.details.details.suggestedSlot;
  if (!isRecord(slot) || typeof slot.barberId !== 'number' || typeof slot.start !== 'string') return null;
  return { barberId: slot.barberId, start: slot.start };
}

function businessDateTime(value: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` };
}

export default function ReviewPaymentStepPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const serviceIds = useBookingDraftStore((state) => state.serviceIds);
  const barberId = useBookingDraftStore((state) => state.barberId);
  const date = useBookingDraftStore((state) => state.date);
  const time = useBookingDraftStore((state) => state.time);
  const holdKey = useBookingDraftStore((state) => state.holdKey);
  const holdExpiresAt = useBookingDraftStore((state) => state.holdExpiresAt);
  const customerName = useBookingDraftStore((state) => state.customerName);
  const customerPhone = useBookingDraftStore((state) => state.customerPhone);
  const setBarberId = useBookingDraftStore((state) => state.setBarberId);
  const setSlot = useBookingDraftStore((state) => state.setSlot);
  const setStep = useBookingDraftStore((state) => state.setStep);
  const clearDraftAfterBooking = useBookingDraftStore((state) => state.clearAfterBooking);
  const [reservationExpired, setReservationExpired] = useState(() => !holdExpiresAt || !Number.isFinite(Date.parse(holdExpiresAt)) || Date.parse(holdExpiresAt) <= Date.now());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [suggestedSlot, setSuggestedSlot] = useState<SuggestedSlot | null>(null);
  const [accountConflict, setAccountConflict] = useState(false);
  const form = useForm<BookingReviewValues>({ resolver: zodResolver(bookingReviewSchema), defaultValues: { policyAccepted: false } });
  const serviceCatalogQuery = usePublicServiceCatalog();
  const barbersQuery = useAvailableBarbers(serviceIds);
  const estimateQuery = useBookingEstimate(serviceIds, barberId);
  const policyQuery = useBookingPolicy();
  const bookingMutation = useMutation({
    mutationFn: async () => {
      const session = useSessionStore.getState();
      const authorizationToken = session.user?.role === 'customer' && session.token ? undefined : (await createGuestSession({ name: customerName, phone: customerPhone })).token;
      return createAppointment({ serviceIds, barberId: Number(barberId), start: new Date(`${date}T${time}:00${FIXED_OFFSET}`).toISOString(), holdKey: holdKey ?? '' }, authorizationToken);
    },
    onSuccess: (appointment) => {
      void queryClient.invalidateQueries({ queryKey: ['availability-days'] });
      void queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      clearDraftAfterBooking();
      const tokenFragment = appointment.guestToken ? `#token=${encodeURIComponent(appointment.guestToken)}` : '';
      navigate(`/agendar/confirmado/${appointment.id}${tokenFragment}`);
    },
    onError: (error) => {
      const suggestion = suggestedSlotFromError(error);
      setSuggestedSlot(suggestion);
      const serverMessage = serverErrorMessage(error);
      setAccountConflict(error instanceof HttpError && error.status === 409 && /telefone pertence a uma conta/i.test(serverMessage));
      setSubmitError(
        error instanceof HttpError && error.status === 409 && suggestion ? `Esse horário não está mais disponível. Próximo horário sugerido: ${formatDateTime(suggestion.start)}.`
        : error instanceof HttpError && error.status === 409 ? 'A reserva temporária expirou ou deixou de estar disponível. Escolha outro horário para continuar.'
        : serverMessage,
      );
    },
  });
  const services = serviceCatalogQuery.data?.services.filter((service) => serviceIds.includes(String(service.id))) ?? [];
  const barber = barbersQuery.data?.find((item) => String(item.id) === barberId);
  const hasBookingDetails = Boolean(serviceIds.length && barberId && date && time && holdKey && holdExpiresAt && customerName && customerPhone);
  const hasActiveReservation = hasBookingDetails && !reservationExpired;
  const isLoading = serviceCatalogQuery.isPending || barbersQuery.isPending || estimateQuery.isPending || policyQuery.isPending;
  const hasQueryError = serviceCatalogQuery.isError || barbersQuery.isError || estimateQuery.isError || policyQuery.isError;
  const canConfirm = hasActiveReservation && !isLoading && !hasQueryError && services.length === serviceIds.length && Boolean(barber && estimateQuery.data && policyQuery.data);

  useEffect(() => {
    document.title = 'Revisar agendamento | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Revise os dados, confira a política de cancelamento e confirme o agendamento.';
  }, []);

  useEffect(() => {
    if (!serviceIds.length) {
      navigate('/agendar');
      return;
    }
    if (!barberId || !date || !time || !holdKey || !holdExpiresAt) {
      navigate('/agendar/horario');
      return;
    }
    if (!customerName || !customerPhone) {
      navigate('/agendar/dados');
      return;
    }
    if (hasActiveReservation) setStep('review');
  }, [barberId, customerName, customerPhone, date, hasActiveReservation, holdExpiresAt, holdKey, navigate, serviceIds.length, setStep, time]);

  useEffect(() => {
    if (!holdExpiresAt) {
      setReservationExpired(true);
      return;
    }
    const remaining = Date.parse(holdExpiresAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      setReservationExpired(true);
      return;
    }
    setReservationExpired(false);
    const timeout = window.setTimeout(() => setReservationExpired(true), remaining);
    return () => window.clearTimeout(timeout);
  }, [holdExpiresAt]);

  async function confirmBooking() {
    setSubmitError(null);
    setSuggestedSlot(null);
    setAccountConflict(false);
    try {
      await bookingMutation.mutateAsync();
    } catch {
      // The mutation state renders the API error and any suggested slot.
    }
  }

  async function returnToAvailability() {
    if (holdKey) {
      try {
        await deleteSlotHold(holdKey);
      } catch (error) {
        if (!(error instanceof HttpError && error.status === 404)) {
          setSubmitError('Não foi possível liberar a reserva anterior. Tente novamente antes de escolher outro horário.');
          return;
        }
      }
    }
    const targetDate = suggestedSlot ? businessDateTime(suggestedSlot.start).date : date;
    if (suggestedSlot && String(suggestedSlot.barberId) !== barberId) setBarberId(String(suggestedSlot.barberId));
    setSlot(targetDate, null, null);
    setStep('slot');
    navigate('/agendar/horario');
  }

  function retryQueries() {
    void Promise.all([serviceCatalogQuery.refetch(), barbersQuery.refetch(), estimateQuery.refetch(), policyQuery.refetch()]);
  }

  if (!serviceIds.length) return <div className="min-h-48" aria-label="Voltando à escolha de serviços" />;

  if (!hasBookingDetails) {
    return (
      <div className="space-y-6">
        <PageHeader title="Revisar agendamento" description="Confira os detalhes antes de confirmar." />
        <ErrorState
          title="Complete os dados do agendamento"
          description="Volte à etapa anterior para escolher e reservar um horário e informar seus dados."
          onRetry={() => navigate('/agendar/dados')}
          retryLabel="Voltar aos seus dados"
        />
      </div>
    );
  }

  if (reservationExpired) {
    return (
      <div className="space-y-6">
        <PageHeader title="Revisar agendamento" description="A reserva temporária é necessária para confirmar este horário." />
        <ErrorState title="Sua reserva expirou" description="Escolha outro horário para continuar com o agendamento." onRetry={() => void returnToAvailability()} retryLabel="Escolher outro horário" />
      </div>
    );
  }

  if (hasQueryError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Revisar agendamento" description="Não foi possível carregar todos os dados necessários para a revisão." />
        <ErrorState description="Confira sua conexão e tente carregar novamente antes de confirmar." onRetry={retryQueries} />
      </div>
    );
  }

  const estimate = estimateQuery.data;
  const priceLabel =
    estimate ?
      estimate.subtotal.min === estimate.subtotal.max ?
        formatBRL(estimate.subtotal.min)
      : `${formatBRL(estimate.subtotal.min)}–${formatBRL(estimate.subtotal.max)}`
    : '—';
  const durationLabel =
    estimate ?
      estimate.durationMin.min === estimate.durationMin.max ?
        formatDuration(estimate.durationMin.min)
      : `${formatDuration(estimate.durationMin.min)}–${formatDuration(estimate.durationMin.max)}`
    : '—';

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
              {isLoading ?
                <div className="space-y-2" aria-label="Carregando serviços">
                  {Array.from({ length: Math.max(serviceIds.length, 1) }, (_, index) => (
                    <Skeleton key={index} className="h-5 w-2/3" />
                  ))}
                </div>
              : <ul className="space-y-1 text-sm">
                  {services.map((service) => (
                    <li key={service.id}>{service.name}</li>
                  ))}
                </ul>
              }
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm text-muted-foreground">Profissional</p>
                  {isLoading ?
                    <Skeleton className="mt-1 h-5 w-32" />
                  : <p className="font-medium">{barber?.name ?? '—'}</p>}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm text-muted-foreground">Data e horário</p>
                  <p className="font-medium">{date && time ? formatDateTime(`${date}T${time}:00${FIXED_OFFSET}`) : '—'}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm text-muted-foreground">Duração estimada</p>
                  {isLoading ?
                    <Skeleton className="mt-1 h-5 w-24" />
                  : <p className="font-medium">{durationLabel}</p>}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total estimado</p>
                {isLoading ?
                  <Skeleton className="mt-1 h-6 w-28" />
                : <p className="font-heading text-xl font-semibold text-primary">{priceLabel}</p>}
              </div>
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

            {submitError && (
              <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm" role="alert">
                <p className="text-destructive">{submitError}</p>
                {suggestedSlot && <p>Próxima opção: {formatDateTime(suggestedSlot.start)}.</p>}
                {accountConflict && (
                  <Button asChild type="button" variant="outline" className="min-h-11">
                    <Link href="/entrar">Entrar na minha conta</Link>
                  </Button>
                )}
                {suggestedSlot || (bookingMutation.error instanceof HttpError && bookingMutation.error.status === 409) ?
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => void returnToAvailability()}>
                    Ver horários disponíveis
                  </Button>
                : <Button type="button" variant="outline" className="min-h-11" disabled={!canConfirm || bookingMutation.isPending} onClick={() => void form.handleSubmit(confirmBooking)()}>
                    Tentar novamente
                  </Button>
                }
              </div>
            )}

            <Form {...form}>
              <form id="booking-review-consent" onSubmit={form.handleSubmit(confirmBooking)}>
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
                      <div className="space-y-1">
                        <FormLabel htmlFor="booking-policy-accepted" className="cursor-pointer leading-relaxed">
                          Estou ciente da política de cancelamento:{' '}
                          {policyQuery.data?.cancelBeforeHours === 0 ?
                            'posso solicitar o cancelamento a qualquer momento antes do atendimento.'
                          : `solicite o cancelamento com pelo menos ${policyQuery.data?.cancelBeforeHours ?? '—'} horas de antecedência.`}
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </form>
            </Form>

            {isLoading && (
              <p role="status" className="text-sm text-muted-foreground">
                Carregando os dados da revisão…
              </p>
            )}
            {bookingMutation.isPending && (
              <p role="status" className="text-sm text-muted-foreground">
                Confirmando seu horário…
              </p>
            )}
            {hasActiveReservation && holdExpiresAt && (
              <p className="text-sm text-muted-foreground">
                <Countdown expiresAt={holdExpiresAt} onExpire={() => setReservationExpired(true)} />
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Política de cancelamento</CardTitle>
            <CardDescription>Confira antes de confirmar o agendamento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {policyQuery.isPending ?
              <Skeleton className="h-12 w-full" aria-label="Carregando política de cancelamento" />
            : <p>
                {policyQuery.data?.cancelBeforeHours === 0 ?
                  'Entre em contato com a barbearia antes do horário reservado para solicitar o cancelamento.'
                : `Cancelamentos devem ser solicitados com pelo menos ${policyQuery.data?.cancelBeforeHours ?? '—'} horas de antecedência do atendimento.`}
              </p>
            }
            <p>O horário permanece reservado por tempo limitado. Se a reserva expirar ou houver conflito, será necessário escolher outro horário.</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate('/agendar/dados')}>
          Voltar aos seus dados
        </Button>
        <p className="text-sm text-muted-foreground">A confirmação não exige pagamento online.</p>
      </div>

      <BookingSummaryFooter
        actionLabel={bookingMutation.isPending ? 'Confirmando…' : 'Confirmar agendamento'}
        disabled={!canConfirm || bookingMutation.isPending}
        onContinue={() => void form.handleSubmit(confirmBooking)()}
      />
    </div>
  );
}
