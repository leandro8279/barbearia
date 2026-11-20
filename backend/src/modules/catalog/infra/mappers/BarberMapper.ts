import { Barber } from '@/modules/catalog/domain/entities/Barber';
import { BarberEntity } from '@/modules/catalog/infra/entities/BarberEntity';
import { BarberServiceEntity } from '@/modules/catalog/infra/entities/BarberServiceEntity';

export class BarberMapper {
  static toDomain(entity: BarberEntity, name: string, links: BarberServiceEntity[]): Barber {
    return Barber.restore({
      id: entity.id,
      userId: entity.userId,
      name,
      slug: entity.slug,
      bio: entity.bio ?? '',
      specialties: entity.specialties ?? [],
      commissionServicePct: entity.commissionServicePct,
      commissionProductPct: entity.commissionProductPct,
      photo: entity.photo,
      pixKey: entity.pixKey,
      active: entity.active,
      serviceLinks: links.map(({ serviceId, commissionPct }) => ({ serviceId, commissionPct })),
    });
  }
}
