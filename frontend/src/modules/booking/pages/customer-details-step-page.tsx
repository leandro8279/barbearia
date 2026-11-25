import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CalendarClock, Clock3, UserRound } from 'lucide-react';
import { useLocation } from 'wouter';
import { BookingSummaryFooter } from '@/modules/booking/components/booking-summary-footer';
import { useAvailableBarbers, useBookingEstimate } from '@/modules/booking/hooks/use-booking-data';
import { customerDetailsSchema, type CustomerDetailsValues } from '@/modules/booking/schemas/customer-details.schema';
import { Countdown } from '@/shared/components/countdown';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { PhoneInput } from '@/shared/components/phone-input';
import { formatBRL, formatDateTime, formatDuration } from '@/shared/lib/format';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

export default function CustomerDetailsStepPage() {
  const [, navigate] = useLocation();
  const serviceIds = useBookingDraftStore((state) => state.serviceIds);
  const barberId = useBookingDraftStore((state) => state.barberId);
  const date = useBookingDraftStore((state) => state.date);
  const time = useBookingDraftStore((state) => state.time);
  const holdKey = useBookingDraftStore((state) => state.holdKey);
  const holdExpiresAt = useBookingDraftStore((state) => state.holdExpiresAt);
  const customerName = useBookingDraftStore((state) => state.customerName);
  const customerPhone = useBookingDraftStore((state) => state.customerPhone);
  const setCustomer = useBookingDraftStore((state) => state.setCustomer);
  const setSlot = useBookingDraftStore((state) => state.setSlot);
  const setStep = useBookingDraftStore((state) => state.setStep);
  const [reservationExpired, setReservationExpired] = useState(() => !holdExpiresAt || !Number.isFinite(Date.parse(holdExpiresAt)) || Date.parse(holdExpiresAt) <= Date.now());
  const form = useForm<CustomerDetailsValues>({ resolver: zodResolver(customerDetailsSchema), defaultValues: { name: customerName, phone: customerPhone } });
  const barbersQuery = useAvailableBarbers(serviceIds);
  const estimateQuery = useBookingEstimate(serviceIds, barberId);
  const hasReservationDetails = Boolean(serviceIds.length && barberId && date && time && holdKey && holdExpiresAt);
  const hasActiveReservation = hasReservationDetails && !reservationExpired;
  const selectedBarber = barbersQuery.data?.find((barber) => String(barber.id) === barberId);

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
    if (!serviceIds.length) {
      navigate('/agendar');
      return;
    }
    if (hasActiveReservation) setStep('details');
  }, [hasActiveReservation, navigate, serviceIds.length, setStep]);

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

  function returnToSlotSelection() {
    setSlot(date, null, null);
    setStep('slot');
    navigate('/agendar/horario');
  }

  function saveCustomer(values: CustomerDetailsValues) {
    if (!hasActiveReservation) return;
    setCustomer(values);
    setStep('review');
    navigate('/agendar/revisao');
  }

  if (!serviceIds.length) return <div className="min-h-48" aria-label="Voltando à escolha de serviços" />;

  if (!hasActiveReservation) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Etapa 4 de 4" title="Seus dados" description="Informe seus dados de contato antes de revisar o agendamento." />
        <ErrorState
          title={reservationExpired ? 'Sua reserva expirou' : 'Escolha um horário primeiro'}
          description={reservationExpired ? 'O horário temporário não está mais reservado. Escolha outro para continuar.' : 'Para informar seus dados, primeiro selecione e reserve um horário.'}
          onRetry={returnToSlotSelection}
          retryLabel="Escolher outro horário"
        />
      </div>
    );
  }

  const estimate = estimateQuery.data;
  const durationLabel =
    estimate ?
      estimate.durationMin.min === estimate.durationMin.max ?
        formatDuration(estimate.durationMin.min)
      : `${formatDuration(estimate.durationMin.min)}–${formatDuration(estimate.durationMin.max)}`
    : null;
  const priceLabel =
    estimate ?
      estimate.subtotal.min === estimate.subtotal.max ?
        formatBRL(estimate.subtotal.min)
      : `A partir de ${formatBRL(estimate.subtotal.min)}`
    : null;

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Etapa 4 de 4" title="Seus dados" description="Informe ou confirme seus dados de contato para seguir para a revisão do agendamento." />

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
                        <PhoneInput id="booking-customer-phone" value={field.value} onValueChange={field.onChange} name={field.name} aria-label="Telefone ou WhatsApp com DDD" />
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
                <p className="font-medium">{date && time ? formatDateTime(`${date}T${time}:00-03:00`) : '—'}</p>
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
                    <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => void barbersQuery.refetch()}>
                      Tentar novamente
                    </Button>
                  </div>
                : <p className="font-medium">{selectedBarber?.name ?? 'Profissional selecionado'}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Reserva temporária</p>
                <Countdown expiresAt={holdExpiresAt ?? ''} onExpire={() => setReservationExpired(true)} className="font-medium" />
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
                  <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => void estimateQuery.refetch()}>
                    Tentar novamente
                  </Button>
                </div>
              : <p className="font-medium">{durationLabel ?? '—'}</p>}
              <p className="mt-3 text-sm text-muted-foreground">Valor estimado</p>
              {estimateQuery.isPending ?
                <Skeleton className="mt-1 h-6 w-32" aria-label="Carregando valor estimado" />
              : estimateQuery.isError ?
                <p className="font-heading text-lg text-muted-foreground">Indisponível</p>
              : <p className="font-heading text-lg text-primary">{priceLabel ?? '—'}</p>}
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

      <BookingSummaryFooter actionLabel="Continuar para revisão" disabled={!hasActiveReservation || form.formState.isSubmitting} onContinue={() => void form.handleSubmit(saveCustomer)()} />
    </div>
  );
}
