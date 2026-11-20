import type { Barber } from '@/modules/catalog/domain/entities/Barber';

export interface IBarberRepository {
  findActive(): Promise<Barber[]>;
}
