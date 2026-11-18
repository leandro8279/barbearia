import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { useAvailableBarbers, useBookingEstimate } from '@/modules/booking/hooks/use-booking-data';
import { customerDetailsSchema, CustomerDetailsValues } from '@/modules/booking/schemas/customer-details.schema';

import { formatBRL, formatDuration } from '@/shared/lib/format';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { reaction } from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import { useLocation } from 'wouter';

export const useBookingCustomerDetailsPage = () => {
  const [, navigate] = useLocation();
  const bookingDraftStore = useBookingDraftStore();
  const barbersQuery = useAvailableBarbers(() => ({ serviceIds: bookingDraftStore.serviceIds }));
  const estimateQuery = useBookingEstimate(() => ({
    serviceIds: bookingDraftStore.serviceIds,
    barberId: bookingDraftStore.barberId,
  }));

  const form = useForm<CustomerDetailsValues>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: { name: bookingDraftStore.customerName, phone: bookingDraftStore.customerPhone },
  });

  const store = useLocalObservable(() => ({
    reservationExpired:
      !bookingDraftStore.holdExpiresAt ||
      !Number.isFinite(Date.parse(bookingDraftStore.holdExpiresAt)) ||
      Date.parse(bookingDraftStore.holdExpiresAt) <= Date.now(),
    setReservationExpired: (value: boolean) => (store.reservationExpired = value),
    get durationLabel() {
      if (!estimateQuery.estimate) return null;

      if (estimateQuery.estimate.durationMin.min === estimateQuery.estimate.durationMin.max) {
        return formatDuration(estimateQuery.estimate.durationMin.min);
      }

      return `${formatDuration(estimateQuery.estimate.durationMin.min)}–${formatDuration(estimateQuery.estimate.durationMin.max)}`;
    },

    get priceLabel() {
      if (!estimateQuery.estimate) return null;

      if (estimateQuery.estimate.subtotal.min === estimateQuery.estimate.subtotal.max) {
        return formatBRL(estimateQuery.estimate.subtotal.min);
      }

      return `A partir de ${formatBRL(estimateQuery.estimate.subtotal.min)}`;
    },
    get hasReservationDetails() {
      return Boolean(
        bookingDraftStore.serviceIds.length &&
        bookingDraftStore.barberId &&
        bookingDraftStore.date &&
        bookingDraftStore.time &&
        bookingDraftStore.holdKey &&
        bookingDraftStore.holdExpiresAt,
      );
    },
    get hasActiveReservation() {
      return this.hasReservationDetails && !this.reservationExpired;
    },
  }));

  useEffect(() => {
    let timeout = 0;
    const dispose = reaction(
      () => bookingDraftStore.holdExpiresAt,
      (holdExpiresAt) => {
        if (!holdExpiresAt) {
          store.setReservationExpired(true);
          return;
        }
        const remaining = Date.parse(holdExpiresAt) - Date.now();
        if (!Number.isFinite(remaining) || remaining <= 0) {
          store.setReservationExpired(true);
          return;
        }
        store.setReservationExpired(false);
        timeout = window.setTimeout(() => store.setReservationExpired(true), remaining);
      },
    );

    return () => {
      dispose();
      window.clearTimeout(timeout);
    };
  }, [store, bookingDraftStore]);

  function saveCustomer(values: CustomerDetailsValues) {
    if (!store.hasActiveReservation) return;
    bookingDraftStore.setCustomer(values);
    bookingDraftStore.setStep('review');
    navigate('/agendar/revisao');
  }

  console.log(form.formState);

  return { form, store, barbersQuery, estimateQuery, saveCustomer };
};
