import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { deleteSlotHold } from '@/modules/booking/api/booking';
import { useAvailableBarbers, useBookingEstimate, useBookingMutation, useBookingPolicy } from '@/modules/booking/hooks/use-booking-data';
import { bookingReviewSchema, BookingReviewValues } from '@/modules/booking/schemas/booking-review.schema';
import { usePublicServiceCatalog } from '@/modules/site/hooks/use-public-service-catalog';

import { formatBRL, formatDateTime, formatDuration } from '@/shared/lib/format';
import { HttpError } from '@/shared/lib/http';
import { BUSINESS_TIME_ZONE, FIXED_OFFSET } from '@/shared/lib/time';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { sessionStore } from '@/shared/stores/session-store';

import { reaction } from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import { useLocation } from 'wouter';

interface SuggestedSlot {
  barberId: number;
  start: string;
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

export const useBookingReviewPaymentPage = () => {
  const [, navigate] = useLocation();
  const policyQuery = useBookingPolicy();
  const bookingStore = useBookingDraftStore();
  const bookingMutation = useBookingMutation();
  const serviceCatalogQuery = usePublicServiceCatalog();
  const barbersQuery = useAvailableBarbers(() => ({ serviceIds: bookingStore.serviceIds }));
  const estimateQuery = useBookingEstimate(() => ({ serviceIds: bookingStore.serviceIds, barberId: bookingStore.barberId }));
  const form = useForm<BookingReviewValues>({ resolver: zodResolver(bookingReviewSchema), defaultValues: { policyAccepted: false } });

  const store = useLocalObservable(() => ({
    accountConflict: false,
    submitError: null as string | null,
    suggestedSlot: null as SuggestedSlot | null,
    reservationExpired: !bookingStore.holdExpiresAt || !Number.isFinite(Date.parse(bookingStore.holdExpiresAt)) || Date.parse(bookingStore.holdExpiresAt) <= Date.now(),

    setSubmitError: (value: string | null) => (store.submitError = value),
    setAccountConflict: (value: boolean) => (store.accountConflict = value),
    setReservationExpired: (value: boolean) => (store.reservationExpired = value),
    setSuggestedSlot: (value: SuggestedSlot | null) => (store.suggestedSlot = value),
    get services() {
      return serviceCatalogQuery.services.filter((service) => bookingStore.serviceIds.includes(String(service.id))) ?? [];
    },
    get hasQueryError() {
      return serviceCatalogQuery.isError || barbersQuery.isError || estimateQuery.isError || policyQuery.isError;
    },
    get barber() {
      return barbersQuery.barbers.find((item) => String(item.id) === bookingStore.barberId);
    },
    get isLoading() {
      return serviceCatalogQuery.isPending || barbersQuery.isPending || estimateQuery.isPending || policyQuery.isPending;
    },
    get hasActiveReservation() {
      return bookingStore.hasBookingDetails && !this.reservationExpired;
    },
    get durationLabel() {
      if (!estimateQuery.estimate) return '—';

      if (estimateQuery.estimate.durationMin.min === estimateQuery.estimate.durationMin.max) return formatDuration(estimateQuery.estimate.durationMin.min);
      return `${formatDuration(estimateQuery.estimate.durationMin.min)}–${formatDuration(estimateQuery.estimate.durationMin.max)}`;
    },

    get priceLabel() {
      if (!estimateQuery.estimate) return '—';

      if (estimateQuery.estimate.subtotal.min === estimateQuery.estimate.subtotal.max) return formatBRL(estimateQuery.estimate.subtotal.min);

      return `${formatBRL(estimateQuery.estimate.subtotal.min)}–${formatBRL(estimateQuery.estimate.subtotal.max)}`;
    },
    get canConfirm() {
      return (
        this.hasActiveReservation &&
        !this.isLoading &&
        !this.hasQueryError &&
        this.services.length === bookingStore.serviceIds.length &&
        Boolean(this.barber && estimateQuery.estimate && policyQuery.policy)
      );
    },
  }));

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
    const dispose = reaction(
      () => ({
        date: bookingStore.date,
        time: bookingStore.time,
        holdKey: bookingStore.holdKey,
        barberId: bookingStore.barberId,
        serviceIds: bookingStore.serviceIds,
        customerName: bookingStore.customerName,
        holdExpiresAt: bookingStore.holdExpiresAt,
        customerPhone: bookingStore.customerPhone,
        hasActiveReservation: store.hasActiveReservation,
      }),
      ({ serviceIds, barberId, date, time, holdKey, holdExpiresAt, customerName, customerPhone, hasActiveReservation }) => {
        if (!serviceIds.length) return navigate('/agendar');

        if (!barberId || !date || !time || !holdKey || !holdExpiresAt) return navigate('/agendar/horario');

        if (!customerName || !customerPhone) return navigate('/agendar/dados');

        if (hasActiveReservation) bookingStore.setStep('review');
      },
    );

    return () => dispose();
  }, [bookingStore, navigate, store]);

  useEffect(() => {
    let timeout = 0;
    const dispose = reaction(
      () => bookingStore.holdExpiresAt,
      (holdExpiresAt) => {
        if (!holdExpiresAt) return store.setReservationExpired(true);

        const remaining = Date.parse(holdExpiresAt) - Date.now();
        if (!Number.isFinite(remaining) || remaining <= 0) return store.setReservationExpired(true);

        store.setReservationExpired(false);
        timeout = window.setTimeout(() => store.setReservationExpired(true), remaining);
      },
    );
    return () => {
      dispose();
      window.clearTimeout(timeout);
    };
  }, [bookingStore, store]);

  async function returnToAvailability() {
    if (bookingStore.holdKey) {
      try {
        await deleteSlotHold(bookingStore.holdKey);
      } catch (error) {
        if (!(error instanceof HttpError && error.status === 404)) {
          store.setSubmitError('Não foi possível liberar a reserva anterior. Tente novamente antes de escolher outro horário.');
          return;
        }
      }
    }
    const targetDate = store.suggestedSlot ? businessDateTime(store.suggestedSlot.start).date : bookingStore.date;
    if (store.suggestedSlot && String(store.suggestedSlot.barberId) !== bookingStore.barberId) bookingStore.setBarberId(String(store.suggestedSlot.barberId));
    bookingStore.setSlot(targetDate, null, null);
    bookingStore.setStep('slot');
    navigate('/agendar/horario');
  }

  function confirmBooking() {
    store.setSubmitError(null);
    store.setSuggestedSlot(null);
    store.setAccountConflict(false);

    bookingMutation.mutate(
      {
        holdKey: bookingStore.holdKey ?? '',
        serviceIds: bookingStore.serviceIds,
        customerName: bookingStore.customerName,
        barberId: Number(bookingStore.barberId!),
        customerPhone: bookingStore.customerPhone,
        hasCreateSession: !(sessionStore.user?.role === 'customer' && sessionStore.token),
        start: new Date(`${bookingStore.date}T${bookingStore.time}:00${FIXED_OFFSET}`).toISOString(),
      },
      {
        onSuccess: () => bookingStore.clearAfterBooking(),
        onError: (error) => {
          const suggestion = suggestedSlotFromError(error);
          store.setSuggestedSlot(suggestion);
          const serverMessage = serverErrorMessage(error);
          store.setAccountConflict(error instanceof HttpError && error.status === 409 && /telefone pertence a uma conta/i.test(serverMessage));
          store.setSubmitError(
            error instanceof HttpError && error.status === 409 && suggestion ? `Esse horário não está mais disponível. Próximo horário sugerido: ${formatDateTime(suggestion.start)}.`
            : error instanceof HttpError && error.status === 409 ? 'A reserva temporária expirou ou deixou de estar disponível. Escolha outro horário para continuar.'
            : serverMessage,
          );
        },
      },
    );
  }

  function retryQueries() {
    void Promise.all([serviceCatalogQuery.result.refetch(), barbersQuery.result.refetch(), estimateQuery.result.refetch(), policyQuery.result.refetch()]);
  }

  return { store, form, serviceCatalogQuery, bookingMutation, policyQuery, retryQueries, confirmBooking, returnToAvailability };
};
