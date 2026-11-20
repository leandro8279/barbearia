import { Barber } from '@/modules/catalog/domain/entities/Barber';
import { IBarberRepository } from '@/modules/catalog/domain/repositories/BarberRepositoryInterface';
import { BarberEntity } from '@/modules/catalog/infra/entities/BarberEntity';
import { BarberServiceEntity } from '@/modules/catalog/infra/entities/BarberServiceEntity';
import { BarberMapper } from '@/modules/catalog/infra/mappers/BarberMapper';
import { UserEntity } from '@/modules/users/infra/entities/UserEntity';

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

  async findActive(): Promise<Barber[]> {
    const barbers = await this.barbers.findBy({ active: true });
    if (!barbers.length) return [];

    const [users, links] = await Promise.all([
      this.users.find({ where: { id: In(barbers.map((b) => b.userId)) }, select: { id: true, name: true } }),
      this.links.findBy({ barberId: In(barbers.map((b) => b.id)) }),
    ]);

    const nameByUserId = new Map(users.map((u) => [u.id, u.name]));
    const linksByBarberId = Map.groupBy(links, (link) => link.barberId);

    return barbers.map((barber) =>
      BarberMapper.toDomain(barber, nameByUserId.get(barber.userId) || barber.slug || 'Profissional', linksByBarberId.get(barber.id) ?? []),
    );
  }
}
