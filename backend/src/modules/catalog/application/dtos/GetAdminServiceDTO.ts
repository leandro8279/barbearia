import type { AdminServiceDetail } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

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

export interface GetAdminServiceResponseDTO extends AdminServiceDetail {
  barberAssignments: BarberAssignmentDTO[];
}
