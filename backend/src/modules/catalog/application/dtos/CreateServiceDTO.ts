export interface CreateServiceBarberAssignmentDTO {
  barberId: string;
  commissionPct: number | null;
}

export interface CreateServiceDTO {
  name: string;
  slug?: string;
  categoryId: string;
  description: string;
  image: string;
  durationMin: number;
  bufferMin: number;
  price: number;
  commissionPct: number;
  active: boolean;
  featured: boolean;
  barberAssignments: CreateServiceBarberAssignmentDTO[];
  actorId: string;
}
