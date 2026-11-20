import { ServiceResponseDTO, toServiceResponse } from '@/modules/catalog/application/dtos/ServiceResponseDTO';
import type { Barber } from '@/modules/catalog/domain/entities/Barber';
import type { Service } from '@/modules/catalog/domain/entities/Service';

export interface GetAdminServiceDTO {
  id: string;
}

export interface BarberAssignmentDTO {
  barberId: string;
  name: string;
  photo: string | null;
  assigned: boolean;
  commissionPct: number | null;
}

export interface GetAdminServiceResponseDTO extends ServiceResponseDTO {
  image: string;
  barberAssignments: BarberAssignmentDTO[];
}

export function toGetAdminServiceResponse(service: Service, barbers: Barber[]): GetAdminServiceResponseDTO {
  const barberAssignments = barbers
    .map((barber) => ({
      barberId: barber.id,
      name: barber.name,
      photo: barber.photo,
      assigned: barber.isAssignedTo(service.id),
      commissionPct: barber.commissionFor(service.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return { ...toServiceResponse(service), image: service.image, barberAssignments };
}
