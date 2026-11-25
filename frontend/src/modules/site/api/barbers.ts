import { apiRequest, buildQuery } from '@/shared/lib/http';

export interface PublicBarber {
  id: number;
  name: string;
  photo?: string | null;
  specialties: string[];
}

export interface NextAvailabilitySlot {
  start: string;
}

export interface NextAvailabilityResponse {
  slot: NextAvailabilitySlot | null;
}

export async function getPublicBarbers(): Promise<PublicBarber[]> {
  return apiRequest<PublicBarber[]>(`/barbers${buildQuery({ _page: 1, _limit: 100, _sort: 'name', _order: 'asc', active: 'true' })}`);
}

export async function getBarberNextAvailability(barberId: number): Promise<NextAvailabilityResponse> {
  return apiRequest<NextAvailabilityResponse>(`/availability/next${buildQuery({ serviceIds: 1, barberId })}`);
}
