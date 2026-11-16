import { apiRequest, buildQuery, HttpError } from '@/shared/lib/http';

export interface BookingEstimate {
  durationMin: { min: number; max: number };
  subtotal: { min: number; max: number };
}

export interface AvailableBarber {
  id: number;
  slug: string;
  name: string;
  bio?: string;
  photo?: string | null;
  specialties?: string[];
  rating?: number | null;
  durationMin: number;
  bufferMin: number;
  totalDurationMin: number;
  subtotal: number;
  nextSlot: { start: string } | null;
}

export interface AvailabilityDay {
  date: string;
  slotsCount: number;
  available: boolean;
}

export interface AvailabilitySlot {
  barberId: number;
  start: string;
  end: string;
  durationMin: number;
  bufferMin: number;
  subtotal: number;
  total: number;
}

export interface SlotHold {
  id: number;
  key: string;
  barberId: number;
  start: string;
  end: string;
  expiresAt: string;
  serverTime: string;
}

export interface BookingPolicy {
  cancelBeforeHours: number;
  maxReschedules: number;
  minAdvanceMin: number;
}

export interface CreatedAppointment {
  id: number;
  code: string;
  barberId: number;
  start: string;
  end: string;
  status: string;
  items: Array<{ serviceId: number; name: string; price: number; durationMin: number }>;
  subtotal: number;
  total: number;
  guestToken?: string;
}

export interface ConfirmedAppointment extends Omit<CreatedAppointment, 'barberId' | 'guestToken'> {
  durationMin: number;
  barber: { id: number; name: string };
}

export async function getBookingEstimate(serviceIds: string[], barberId: string | null): Promise<BookingEstimate> {
  return apiRequest<BookingEstimate>(`/public/booking-estimate${buildQuery({ serviceIds: serviceIds.join(','), barberId: barberId ?? undefined })}`);
}

export async function getBookingPolicy(): Promise<BookingPolicy> {
  return apiRequest<BookingPolicy>('/public/booking-policy');
}

export async function createAppointment(
  input: { serviceIds: string[]; barberId: number; start: string; holdKey: string },
  authorizationToken?: string,
): Promise<CreatedAppointment> {
  return apiRequest<CreatedAppointment>('/appointments', {
    method: 'POST',
    ...(authorizationToken ? { headers: { Authorization: `Bearer ${authorizationToken}` } } : {}),
    data: input,
  });
}

export async function getConfirmedAppointment(id: string, guestToken: string | null): Promise<ConfirmedAppointment> {
  return apiRequest<ConfirmedAppointment>(`/public/appointments/${encodeURIComponent(id)}`, {
    headers: guestToken ? { 'X-Appointment-Token': guestToken } : undefined,
  });
}

export async function getAvailableBarbers(serviceIds: string[]): Promise<AvailableBarber[]> {
  return apiRequest<AvailableBarber[]>(`/availability/barbers${buildQuery({ serviceIds: serviceIds.join(',') })}`);
}

export async function getAvailabilityDays(serviceIds: string[], month: string, barberId: string | null): Promise<AvailabilityDay[]> {
  return apiRequest<AvailabilityDay[]>(
    `/availability/days${buildQuery({ serviceIds: serviceIds.join(','), month, barberId: barberId ?? undefined })}`,
  );
}

export async function getAvailabilitySlots(serviceIds: string[], date: string, barberId: string | null): Promise<AvailabilitySlot[]> {
  return apiRequest<AvailabilitySlot[]>(`/availability${buildQuery({ serviceIds: serviceIds.join(','), date, barberId: barberId ?? undefined })}`);
}

export async function createSlotHold(input: { barberId: number; serviceIds: string[]; start: string }): Promise<SlotHold> {
  return apiRequest<SlotHold>('/slotHolds', { method: 'POST', data: input });
}

export async function deleteSlotHold(key: string): Promise<void> {
  return apiRequest<void>(`/slotHolds/${encodeURIComponent(key)}`, { method: 'DELETE' });
}

export interface HoldVariables {
  slot: AvailabilitySlot;
  date: string | null;
  serviceIds: string[];
  previousHoldKey: string | null;
}

export async function releaseHold(key: string): Promise<void> {
  try {
    await deleteSlotHold(key);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return;
    throw error;
  }
}
