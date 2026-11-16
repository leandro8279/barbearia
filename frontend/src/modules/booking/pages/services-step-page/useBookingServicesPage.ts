import { useEffect, useRef } from 'react';

import { usePublicServiceCatalog } from '@/modules/site/hooks/use-public-service-catalog';

import { normalize } from '@/shared/lib/format';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { reaction } from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import { useLocation, useSearch } from 'wouter';

export const useBookingServicesPage = () => {
  const search = useSearch();
  const [, navigate] = useLocation();
  const preelectionHandled = useRef('');
  const catalogQuery = usePublicServiceCatalog();
  const bookingDraftStore = useBookingDraftStore();
  const store = useLocalObservable(() => ({
    get selectedIds() {
      return new Set(bookingDraftStore.serviceIds);
    },
    get suggestedServices() {
      return catalogQuery.services.filter((service) => normalize(service.name).includes('sobrancelha')).slice(0, 3);
    },
    get canContinue() {
      return bookingDraftStore.serviceIds.length > 0 && bookingDraftStore.serviceIds.length <= 4;
    },
  }));

  useEffect(() => {
    const dispose = reaction(
      () => catalogQuery.services,
      (services) => {
        if (services.length === 0) return;
        const params = new URLSearchParams(search);
        const slug = params.get('servico');
        const serviceId = params.get('serviceId');
        const signature =
          slug ? `slug:${slug}`
          : serviceId ? `id:${serviceId}`
          : '';
        if (!signature) {
          preelectionHandled.current = '';
          return;
        }
        if (preelectionHandled.current === signature) return;
        preelectionHandled.current = signature;

        const service =
          slug ? services.find((item) => item.slug === slug)
          : serviceId ? services.find((item) => item.id === Number(serviceId))
          : undefined;
        if (service) bookingDraftStore.setServiceIds([String(service.id)]);
      },
    );

    return () => dispose();
  }, [bookingDraftStore, catalogQuery, search]);

  function toggleService(serviceId: number) {
    const key = String(serviceId);
    if (bookingDraftStore.serviceIds.includes(key)) {
      bookingDraftStore.setServiceIds(bookingDraftStore.serviceIds.filter((id) => id !== key));
      return;
    }
    if (bookingDraftStore.serviceIds.length >= 4) return;
    bookingDraftStore.setServiceIds([...bookingDraftStore.serviceIds, key]);
  }

  function continueBooking() {
    if (bookingDraftStore.serviceIds.length < 1 || bookingDraftStore.serviceIds.length > 4) return;
    bookingDraftStore.setStep('barber');
    navigate('/agendar/profissional');
  }

  return { store, toggleService, continueBooking };
};
