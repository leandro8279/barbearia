import { useQuery } from '@tanstack/react-query';
import { getAvailabilityDays, getAvailabilitySlots, getAvailableBarbers, getBookingEstimate, getBookingPolicy, getConfirmedAppointment } from '@/modules/booking/api/booking';

export function useBookingEstimate(serviceIds: string[], barberId: string | null) {
  return useQuery({
    queryKey: ['booking-estimate', { serviceIds, barberId }],
    queryFn: () => getBookingEstimate(serviceIds, barberId),
    enabled: serviceIds.length > 0 && serviceIds.length <= 4,
    staleTime: 30_000,
  });
}

export function useBookingPolicy() {
  return useQuery({ queryKey: ['booking-policy'], queryFn: getBookingPolicy, staleTime: 60_000 });
}

export function useConfirmedAppointment(id: string, guestToken: string | null) {
  return useQuery({
    queryKey: ['confirmed-appointment', { id, hasGuestToken: Boolean(guestToken) }],
    queryFn: () => getConfirmedAppointment(id, guestToken),
    enabled: /^\d+$/.test(id),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useAvailableBarbers(serviceIds: string[]) {
  return useQuery({
    queryKey: ['availability-barbers', { serviceIds }],
    queryFn: () => getAvailableBarbers(serviceIds),
    enabled: serviceIds.length > 0 && serviceIds.length <= 4,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useAvailabilityDays(serviceIds: string[], month: string, barberId: string | null) {
  return useQuery({
    queryKey: ['availability-days', { serviceIds, month, barberId }],
    queryFn: () => getAvailabilityDays(serviceIds, month, barberId),
    enabled: serviceIds.length > 0 && serviceIds.length <= 4 && /^\d{4}-\d{2}$/.test(month),
    staleTime: 30_000,
  });
}

export function useAvailabilitySlots(serviceIds: string[], date: string | null, barberId: string | null) {
  return useQuery({
    queryKey: ['availability-slots', { serviceIds, date, barberId }],
    queryFn: () => getAvailabilitySlots(serviceIds, date ?? '', barberId),
    enabled: serviceIds.length > 0 && serviceIds.length <= 4 && Boolean(date),
    staleTime: 10_000,
  });
}
