import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDays } from 'lucide-react';
import { rescheduleMyAppointment, type CustomerAppointmentDetail } from '@/modules/account/api/appointments';
import { useAvailabilityDays, useAvailabilitySlots, useBookingPolicy } from '@/modules/booking/hooks/use-booking-data';
import { createSlotHold, deleteSlotHold, type AvailabilitySlot } from '@/modules/booking/api/booking';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import { Calendar } from '@/shared/ui/calendar';
import { SlotGrid } from '@/shared/components/slot-grid';
import { Countdown } from '@/shared/components/countdown';
import { ResponsiveAccountOverlay } from '@/modules/account/components/responsive-account-overlay';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const rescheduleSchema = z.object({ start: z.string().min(1, 'Escolha um novo horário.'), holdKey: z.string().min(1, 'Reserve um horário antes de confirmar.') });

type RescheduleValues = z.infer<typeof rescheduleSchema>;

interface RescheduleAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: CustomerAppointmentDetail;
  loadingAppointment: boolean;
  appointmentError: string | null;
  onRetryAppointment: () => void;
}

function currentBusinessDate(): string {
  return formatDate(new Date(), 'yyyy-MM-dd');
}

function currentBusinessMonth(): string {
  return currentBusinessDate().slice(0, 7);
}

function dateFromMonth(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function monthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function RescheduleAppointmentDialog({ open, onOpenChange, appointment, loadingAppointment, appointmentError, onRetryAppointment }: RescheduleAppointmentDialogProps) {
  const queryClient = useQueryClient();
  const policyQuery = useBookingPolicy();
  const [month, setMonth] = useState(currentBusinessMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [holdKey, setHoldKey] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [holdExpired, setHoldExpired] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RescheduleValues>({ resolver: zodResolver(rescheduleSchema), defaultValues: { start: '', holdKey: '' } });

  const serviceIds = useMemo(() => (open ? (appointment?.items.map((item) => String(item.serviceId)) ?? []) : []), [appointment?.items, open]);
  const barberId = open && appointment ? String(appointment.barberId) : null;
  const daysQuery = useAvailabilityDays(serviceIds, month, barberId);
  const slotsQuery = useAvailabilitySlots(serviceIds, selectedDate, barberId);
  const availableDates = useMemo(() => new Set((daysQuery.data ?? []).filter((day) => day.available).map((day) => day.date)), [daysQuery.data]);
  const slotByTime = useMemo(() => {
    const map = new Map<string, AvailabilitySlot>();
    for (const slot of slotsQuery.data ?? []) {
      const time = formatDate(slot.start, 'HH:mm');
      if (!map.has(time)) map.set(time, slot);
    }
    return map;
  }, [slotsQuery.data]);
  const rescheduleLimit = policyQuery.data?.maxReschedules ?? 2;
  const canReschedule = Boolean(
    appointment && ['pending', 'confirmed'].includes(appointment.status) && new Date(appointment.start).getTime() > Date.now() && appointment.rescheduleCount < rescheduleLimit,
  );
  const isHoldActive = Boolean(holdKey && holdExpiresAt && !holdExpired && new Date(holdExpiresAt).getTime() > Date.now());

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      const values = await form.trigger();
      if (!values || !appointment || !selectedSlot || !holdKey || !isHoldActive) throw new Error('Escolha e reserve um novo horário disponível.');
      return rescheduleMyAppointment(appointment.id, { start: selectedSlot.start, barberId: appointment.barberId, holdKey });
    },
    onSuccess: async () => {
      setHoldKey(null);
      setHoldExpiresAt(null);
      toast.success('Agendamento reagendado.');
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      await queryClient.invalidateQueries({ queryKey: ['availability-days'] });
      await queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
      onOpenChange(false);
    },
    onError: async (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : 'Não foi possível reagendar. Escolha outro horário.');
      await queryClient.invalidateQueries({ queryKey: ['availability-days'] });
      await queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
    },
  });

  useEffect(() => {
    if (!open) return;
    setMonth(currentBusinessMonth());
    setSelectedDate(null);
    setSelectedSlot(null);
    setHoldKey(null);
    setHoldExpiresAt(null);
    setHoldExpired(false);
    setError(null);
    form.reset({ start: '', holdKey: '' });
  }, [form, open, appointment?.id]);

  async function selectSlot(time: string) {
    if (!appointment || isHolding) return;
    const slot = slotByTime.get(time);
    if (!slot) return;

    setIsHolding(true);
    setError(null);
    try {
      const hold = await createSlotHold({ barberId: appointment.barberId, serviceIds, start: slot.start });
      const previousHoldKey = holdKey;
      setSelectedSlot(slot);
      setHoldKey(hold.key);
      setHoldExpiresAt(hold.expiresAt);
      setHoldExpired(false);
      form.setValue('start', slot.start, { shouldValidate: true });
      form.setValue('holdKey', hold.key, { shouldValidate: true });
      if (previousHoldKey) {
        try {
          await deleteSlotHold(previousHoldKey);
        } catch {
          // A reservation that expired while selecting another time is already released by the server.
        }
      }
    } catch (holdError) {
      setError(holdError instanceof Error ? holdError.message : 'Este horário não pôde ser reservado. Escolha outro.');
      void queryClient.invalidateQueries({ queryKey: ['availability-days'] });
      void queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
    } finally {
      setIsHolding(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (isHolding || rescheduleMutation.isPending) return;
    if (!next && !rescheduleMutation.isPending && holdKey) {
      void deleteSlotHold(holdKey).catch(() => undefined);
      setHoldKey(null);
      setHoldExpiresAt(null);
      setSelectedSlot(null);
      form.reset({ start: '', holdKey: '' });
    }
    if (!rescheduleMutation.isPending) onOpenChange(next);
  }

  function handleHoldExpired() {
    const expiredKey = holdKey;
    setHoldExpired(true);
    setHoldKey(null);
    setSelectedSlot(null);
    form.reset({ start: '', holdKey: '' });
    setError('A reserva temporária expirou. Escolha o horário novamente para continuar.');
    if (expiredKey) void deleteSlotHold(expiredKey).catch(() => undefined);
  }

  const selectedCalendarDate = selectedDate ? new Date(`${selectedDate}T12:00:00`) : undefined;

  return (
    <ResponsiveAccountOverlay open={open} onOpenChange={handleOpenChange} title="Reagendar" description="Escolha uma nova data e horário com o mesmo profissional e serviços.">
      {!appointment ?
        loadingAppointment ?
          <p role="status" className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Carregando os dados do agendamento…
          </p>
        : <div className="space-y-3 rounded-lg border border-border p-4 text-sm text-muted-foreground">
            <p role={appointmentError ? 'alert' : 'status'}>{appointmentError ?? 'Selecione um agendamento para continuar.'}</p>
            {appointmentError && (
              <Button type="button" variant="outline" className="min-h-11" onClick={onRetryAppointment}>
                Tentar novamente
              </Button>
            )}
          </div>

      : <>
          {!canReschedule && (
            <p role="alert" className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              {appointment.rescheduleCount >= rescheduleLimit ?
                `Este agendamento já atingiu o limite de ${rescheduleLimit} reagendamentos.`
              : 'Este agendamento não pode mais ser reagendado pela sua conta.'}
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="space-y-3" aria-label="Escolha uma nova data">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                <h3 className="font-medium capitalize">{formatDate(`${month}-01`, 'MMMM yyyy')}</h3>
              </div>
              {daysQuery.isPending ?
                <Skeleton className="h-72 w-full rounded-xl" aria-label="Carregando datas disponíveis" />
              : daysQuery.isError ?
                <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
                  Não foi possível carregar as datas. Feche e tente novamente.
                </p>
              : <Calendar
                  className="mx-auto w-full [--cell-size:--spacing(10)]"
                  mode="single"
                  month={dateFromMonth(month)}
                  onMonthChange={(date) => setMonth(monthString(date))}
                  selected={selectedCalendarDate}
                  onSelect={(date) => {
                    const value = date ? formatDate(date, 'yyyy-MM-dd') : null;
                    setSelectedDate(value);
                    setSelectedSlot(null);
                    setError(null);
                  }}
                  disabled={(date) => {
                    const value = formatDate(date, 'yyyy-MM-dd');
                    return value < currentBusinessDate() || !availableDates.has(value);
                  }}
                  autoFocus
                />
              }
            </section>

            <section className="space-y-3" aria-label="Horários disponíveis">
              <h3 className="font-medium">Horários disponíveis</h3>
              {!selectedDate ?
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Escolha uma data para ver os horários.</p>
              : slotsQuery.isPending ?
                <div className="grid grid-cols-3 gap-2" aria-label="Carregando horários">
                  {Array.from({ length: 6 }, (_, index) => (
                    <Skeleton key={index} className="h-11 rounded-md" />
                  ))}
                </div>
              : slotsQuery.isError ?
                <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
                  Não foi possível carregar os horários. Selecione a data novamente para tentar.
                </p>
              : <SlotGrid
                  slots={[...slotByTime.keys()].map((time) => ({ time, available: true }))}
                  selectedTime={selectedSlot ? formatDate(selectedSlot.start, 'HH:mm') : null}
                  onSelect={(time) => void selectSlot(time)}
                  emptyMessage="Não há horários disponíveis para esta data."
                />
              }
            </section>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {selectedSlot && (
            <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Antes: {formatDateTime(appointment.start)}</p>
              <p className="mt-1 font-medium text-primary">Depois: {formatDateTime(selectedSlot.start)}</p>
              {holdExpiresAt && (
                <p className="mt-2 text-muted-foreground">
                  {isHoldActive ?
                    <Countdown expiresAt={holdExpiresAt} onExpire={handleHoldExpired} />
                  : 'A reserva temporária expirou. Escolha o horário novamente.'}
                </p>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="min-h-11" disabled={rescheduleMutation.isPending || isHolding} onClick={() => handleOpenChange(false)}>
              Voltar
            </Button>
            <Button type="button" className="min-h-11" disabled={!canReschedule || !isHoldActive || rescheduleMutation.isPending || isHolding} onClick={() => rescheduleMutation.mutate()}>
              {rescheduleMutation.isPending ?
                'Confirmando…'
              : isHolding ?
                'Reservando…'
              : 'Confirmar novo horário'}
            </Button>
          </div>
        </>
      }
    </ResponsiveAccountOverlay>
  );
}
