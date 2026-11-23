import type { Barber } from '@/modules/catalog/domain/entities/Barber';

export interface BarberListItemDTO {
  id: string;
  name: string;
  photo: string | null;
}

export type ListAdminBarbersResponseDTO = BarberListItemDTO[];

export function toBarberListItem(barber: Barber): BarberListItemDTO {
  return { id: barber.id, name: barber.name, photo: barber.photo };
}

export function toListAdminBarbersResponse(barbers: Barber[]): ListAdminBarbersResponseDTO {
  return barbers.map(toBarberListItem).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
