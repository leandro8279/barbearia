/* eslint-disable no-useless-assignment */
import { KeyboardEvent } from 'react';

import { AvailabilitySlot } from '@/modules/booking/api/booking';
import {
  useAvailabilityDays,
  useAvailabilitySlots,
  useAvailableBarbers,
  useCreateHoldMutation,
  useReleaseMutation,
} from '@/modules/booking/hooks/use-booking-data';

import { businessTime, formatDate, weekdayOffset } from '@/shared/lib/format';
import { HttpError } from '@/shared/lib/http';
import { BUSINESS_TIME_ZONE } from '@/shared/lib/time';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { useLocalObservable } from 'mobx-react-lite';
import { useLocation } from 'wouter';

export function currentBusinessMonth(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}`;
}

function getClientExpiry(expiresAt: string, serverTime: string): string {
  const expiration = new Date(expiresAt).getTime();
  const serverNow = new Date(serverTime).getTime();
  if (!Number.isFinite(expiration) || !Number.isFinite(serverNow)) return expiresAt;
  return new Date(Date.now() + Math.max(0, expiration - serverNow)).toISOString();
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const useBookingSlotPage = () => {
  const [, navigate] = useLocation();
  const bookingDraftStore = useBookingDraftStore();
  const barbersQuery = useAvailableBarbers(() => ({ serviceIds: bookingDraftStore.serviceIds }));
  const slotsQuery = useAvailabilitySlots(() => ({
    selectedDate: bookingDraftStore.date,
    barberId: bookingDraftStore.barberId,
    serviceIds: bookingDraftStore.serviceIds,
  }));

  const releaseMutation = useReleaseMutation();
  const createHoldMutation = useCreateHoldMutation();
  const daysQuery = useAvailabilityDays(() => ({
    month: store.month,
    barberId: bookingDraftStore.barberId,
    serviceIds: bookingDraftStore.serviceIds,
  }));

  const store = useLocalObservable(() => ({
    holdError: '',
    holdNotice: '',
    isChangingDate: false,
    focusedDate: bookingDraftStore.date,
    month: bookingDraftStore.date?.slice(0, 7) ?? currentBusinessMonth(),
    setMonth: (value: string) => (store.month = value),
    setHoldError: (value: string) => (store.holdError = value),
    setHoldNotice: (value: string) => (store.holdNotice = value),
    setFocusedDate: (value: string) => (store.focusedDate = value),
    setIsChangingDate: (value: boolean) => (store.isChangingDate = value),
    get heldBarber() {
      return barbersQuery.barbers.find((barber) => String(barber.id) === bookingDraftStore.barberId)?.name;
    },
    get headingMonth() {
      return formatDate(`${this.month}-01`, 'MMMM yyyy');
    },
    get isBusy() {
      return this.isChangingDate || createHoldMutation.isLoading || releaseMutation.isLoading;
    },
    get leadingDays() {
      return daysQuery.days.length ? weekdayOffset(daysQuery.days[0].date) : 0;
    },
    get focusDate() {
      if (daysQuery.days.some((day) => day.date === this.focusedDate && day.available)) {
        return this.focusedDate;
      }
      return (
        daysQuery.days.find((day) => day.date === bookingDraftStore.date && day.available)?.date ?? daysQuery.days.find((day) => day.available)?.date
      );
    },

    get hasStoredHold() {
      return Boolean(bookingDraftStore.holdKey && bookingDraftStore.holdExpiresAt && bookingDraftStore.date && bookingDraftStore.time);
    },
    get slotOptions() {
      const byTime = new Map<string, AvailabilitySlot>();
      for (const slot of slotsQuery.slots) {
        const time = businessTime(slot.start);
        if (!byTime.has(time)) byTime.set(time, slot);
      }
      return { byTime, slots: [...byTime.keys()].map((time) => ({ time, available: true })) };
    },

    get activeHold() {
      return Boolean(this.hasStoredHold && bookingDraftStore.holdExpiresAt && new Date(bookingDraftStore.holdExpiresAt).getTime() > Date.now());
    },
  }));

  function handleCalendarDayKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const { key } = event;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key) || store.isBusy) return;

    const days = daysQuery.days ?? [];
    const calendar = event.currentTarget.closest('[data-booking-calendar]');
    const currentIndex = Number(event.currentTarget.dataset.calendarIndex);
    const firstIndex = store.leadingDays;
    const lastIndex = store.leadingDays + days.length - 1;
    let targetIndex: number;
    let step: number;
    let boundary = firstIndex;

    if (key === 'Home' || key === 'End') {
      const rowStart = Math.floor(currentIndex / 7) * 7;
      const rowEnd = rowStart + 6;
      const rowFirst = Math.max(firstIndex, rowStart);
      const rowLast = Math.min(lastIndex, rowEnd);
      targetIndex = key === 'Home' ? rowFirst : rowLast;
      step = key === 'Home' ? 1 : -1;
      boundary = key === 'Home' ? rowLast : rowFirst;
    } else {
      step =
        key === 'ArrowRight' ? 1
        : key === 'ArrowLeft' ? -1
        : key === 'ArrowDown' ? 7
        : -7;
      targetIndex = currentIndex + step;
      boundary = step > 0 ? lastIndex : firstIndex;
    }

    const scanStep = Math.sign(step);
    while (targetIndex >= firstIndex && targetIndex <= lastIndex && (scanStep > 0 ? targetIndex <= boundary : targetIndex >= boundary)) {
      const day = days[targetIndex - firstIndex];
      const target = calendar?.querySelector<HTMLButtonElement>(`button[data-calendar-index="${targetIndex}"]`);
      if (day?.available && target && !target.disabled) {
        event.preventDefault();
        store.setFocusedDate(day.date);
        target.focus();
        return;
      }
      targetIndex += scanStep;
    }
  }

  async function chooseDate(date: string) {
    if (date === bookingDraftStore.date || store.isBusy) return;
    store.setHoldError('');
    store.setHoldNotice('');
    store.setIsChangingDate(true);
    try {
      if (bookingDraftStore.holdKey) await releaseMutation.mutateAsync(bookingDraftStore.holdKey);
      bookingDraftStore.setSlot(date, null, null);
      if (bookingDraftStore.holdKey) store.setHoldNotice('Reserva liberada. Escolha um horário para esta data.');
    } catch (error) {
      store.setHoldError(errorMessage(error, 'Não foi possível liberar a reserva anterior.'));
    } finally {
      store.setIsChangingDate(false);
    }
  }

  function handleHoldExpired() {
    const expiredKey = bookingDraftStore.holdKey;
    bookingDraftStore.setSlot(bookingDraftStore.date, null, null);
    store.setHoldNotice('Sua reserva expirou. Escolha outro horário para continuar.');
    if (expiredKey) releaseMutation.mutate(expiredKey, { onError: () => undefined });
  }

  async function releaseCurrentHold() {
    if (!bookingDraftStore.holdKey || store.isBusy) return;
    store.setHoldError('');
    store.setHoldNotice('');
    try {
      await releaseMutation.mutateAsync(bookingDraftStore.holdKey);
      bookingDraftStore.setSlot(bookingDraftStore.date, null, null);
      store.setHoldNotice('Reserva liberada. Você pode escolher outro horário.');
    } catch (error) {
      store.setHoldError(errorMessage(error, 'Não foi possível liberar o horário reservado.'));
    }
  }

  function chooseTime(time: string) {
    if (!bookingDraftStore.date || store.isBusy) return;
    const slot = store.slotOptions.byTime.get(time);
    if (!slot) return;
    store.setHoldError('');
    store.setHoldNotice('');
    createHoldMutation.mutate(
      { slot, date: bookingDraftStore.date, previousHoldKey: bookingDraftStore.holdKey, serviceIds: bookingDraftStore.serviceIds },
      {
        onSuccess: (hold, variables) => {
          bookingDraftStore.setBarberId(String(hold.barberId));
          bookingDraftStore.setSlot(variables.date, businessTime(hold.start), {
            key: hold.key,
            expiresAt: getClientExpiry(hold.expiresAt, hold.serverTime),
          });
          store.setHoldError('');
          store.setHoldNotice(`Horário reservado às ${businessTime(hold.start)}. Ele ficará guardado por cinco minutos.`);
        },
        onError: (error, variables) => {
          if (variables.previousHoldKey) bookingDraftStore.setSlot(variables.date, null, null);
          store.setHoldError(
            error instanceof HttpError && error.status === 409 ?
              'Esse horário acabou de ser reservado. Atualizamos as opções; escolha outro horário.'
            : errorMessage(error, 'Não foi possível reservar esse horário. Tente novamente.'),
          );
        },
      },
    );
  }

  function continueBooking() {
    if (!store.activeHold || !bookingDraftStore.holdKey) return;
    bookingDraftStore.setStep('details');
    navigate('/agendar/dados');
  }

  return {
    store,
    daysQuery,
    slotsQuery,
    createHoldMutation,
    chooseDate,
    chooseTime,
    continueBooking,
    handleHoldExpired,
    releaseCurrentHold,
    handleCalendarDayKeyDown,
  };
};
