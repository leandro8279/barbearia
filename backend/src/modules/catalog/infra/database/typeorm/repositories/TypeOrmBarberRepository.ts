import { AdminBarber, IBarberRepository } from '@/modules/catalog/domain/repositories/BarberRepositoryInterface';
import { BarberEntity } from '@/modules/catalog/infra/database/typeorm/entities/BarberEntity';
import { BarberServiceEntity } from '@/modules/catalog/infra/database/typeorm/entities/BarberServiceEntity';
import { UserEntity } from '@/modules/users/infra/database/typeorm/entities/UserEntity';

import { DataSource, In, Repository } from 'typeorm';

export class TypeOrmBarberRepository implements IBarberRepository {
  private readonly barbers: Repository<BarberEntity>;
  private readonly links: Repository<BarberServiceEntity>;
  private readonly users: Repository<UserEntity>;

  constructor(dataSource: DataSource) {
    this.barbers = dataSource.getRepository(BarberEntity);
    this.links = dataSource.getRepository(BarberServiceEntity);
    this.users = dataSource.getRepository(UserEntity);
  }

  async findActiveForAdmin(): Promise<AdminBarber[]> {
    const barbers = await this.barbers.findBy({ active: true });
    if (!barbers.length) return [];

    const [users, links] = await Promise.all([
      this.users.find({ where: { id: In(barbers.map((b) => b.userId)) }, select: { id: true, name: true } }),
      this.links.findBy({ barberId: In(barbers.map((b) => b.id)) }),
    ]);

    const nameByUserId = new Map(users.map((u) => [u.id, u.name]));

    return barbers.map((barber) => ({
      id: barber.id,
      name: nameByUserId.get(barber.userId) || barber.slug || 'Profissional',
      photo: barber.photo,
      serviceLinks: links.filter((l) => l.barberId === barber.id).map(({ serviceId, commissionPct }) => ({ serviceId, commissionPct })),
    }));
  }
}
