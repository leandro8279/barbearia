import { CustomerAppointment } from '@/modules/account/api/appointments';

import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { useLocation } from 'wouter';

export const useRepeatAppointment = () => {
  const [, navigate] = useLocation();
  const bookingDraftStore = useBookingDraftStore();

  return (appointment: CustomerAppointment) => {
    const serviceIds = appointment.items.map((item) => String(item.serviceId)).filter(Boolean);
    if (!serviceIds.length) return;
    bookingDraftStore.setServiceIds(serviceIds);
    bookingDraftStore.setBarberId(String(appointment.barberId));
    bookingDraftStore.setStep('services');
    navigate('/agendar');
  };
};
