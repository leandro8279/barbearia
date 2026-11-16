import { useEffect } from 'react';

import { useAvailableBarbers } from '@/modules/booking/hooks/use-booking-data';

import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { reaction } from 'mobx';
import { useLocalObservable } from 'mobx-react-lite';
import { useLocation } from 'wouter';

export const useBookingBarberPage = () => {
  const [, navigate] = useLocation();
  const bookingDraftStore = useBookingDraftStore();
  const barbersQuery = useAvailableBarbers(() => ({ serviceIds: bookingDraftStore.serviceIds }));

  const store = useLocalObservable(() => ({
    selectedChoice: 'any',
    setSelectedChoice: (value: string) => (store.selectedChoice = value),
    get canContinue() {
      if (this.selectedChoice === 'any') return barbersQuery.availableBarbers.length > 0;
      return barbersQuery.availableBarbers.some((barber) => String(barber.id) === this.selectedChoice);
    },
  }));

  useEffect(() => {
    const dispose = reaction(
      () => bookingDraftStore.barberId,
      (barberId) => barberId && store.setSelectedChoice(barberId),
    );

    document.title = 'Escolher profissional | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Escolha um profissional que atende seus serviços ou deixe a escolha em aberto.';

    return () => dispose();
  }, [bookingDraftStore, store]);

  function chooseAny() {
    store.setSelectedChoice('any');
    bookingDraftStore.setBarberId(null);
  }

  function chooseBarber(id: number) {
    store.setSelectedChoice(String(id));
    bookingDraftStore.setBarberId(String(id));
  }

  function continueBooking() {
    if (!store.canContinue) return;
    if (store.selectedChoice === 'any') bookingDraftStore.setBarberId(null);
    bookingDraftStore.setStep('slot');
    navigate('/agendar/horario');
  }

  return { store, chooseAny, chooseBarber, continueBooking };
};
