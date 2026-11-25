import { useLocation } from 'wouter';
import type { CustomerAppointment } from '@/modules/account/api/appointments';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

export function useRepeatAppointment() {
  const [, navigate] = useLocation();
  const setServiceIds = useBookingDraftStore((state) => state.setServiceIds);
  const setBarberId = useBookingDraftStore((state) => state.setBarberId);
  const setStep = useBookingDraftStore((state) => state.setStep);

  return (appointment: CustomerAppointment) => {
    const serviceIds = appointment.items.map((item) => String(item.serviceId)).filter(Boolean);
    if (!serviceIds.length) return;
    setServiceIds(serviceIds);
    setBarberId(String(appointment.barberId));
    setStep('services');
    navigate('/agendar');
  };
}
