import { Barber } from '@/modules/catalog/domain/entities/Barber';
import { IBarberRepository } from '@/modules/catalog/domain/repositories/BarberRepositoryInterface';

export class InMemoryBarberRepository implements IBarberRepository {
  items: Barber[] = [];

  async findActive() {
    return this.items.filter((b) => b.active);
  }
}
