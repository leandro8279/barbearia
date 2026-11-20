export interface BarberServiceLink {
  serviceId: string;
  commissionPct: number;
}

export interface AdminBarber {
  id: string;
  name: string;
  photo: string | null;
  serviceLinks: BarberServiceLink[]; // todos os vínculos do barbeiro
}

export interface IBarberRepository {
  findActiveForAdmin(): Promise<AdminBarber[]>;
}
