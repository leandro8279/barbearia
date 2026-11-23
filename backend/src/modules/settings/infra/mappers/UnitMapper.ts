import { EMPTY_ADDRESS_DETAILS, Unit } from '@/modules/settings/domain/entities/Unit';
import { UnitEntity } from '@/modules/settings/infra/entities/UnitEntity';

export class UnitMapper {
  static toDomain(entity: UnitEntity): Unit {
    return Unit.restore({
      id: entity.id,
      name: entity.name,
      address: entity.address ?? '',
      addressDetails: { ...EMPTY_ADDRESS_DETAILS, ...(entity.addressDetails ?? {}) },
      phone: entity.phone,
      whatsapp: entity.whatsapp ?? '',
      logo: entity.logo ?? null,
      amenities: entity.amenities ?? [],
      photos: entity.photos ?? [],
      businessHours: entity.businessHours ?? [],
      holidays: entity.holidays ?? [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(unit: Unit): Omit<UnitEntity, 'createdAt' | 'updatedAt'> {
    return {
      id: unit.id,
      name: unit.name,
      address: unit.address,
      addressDetails: unit.addressDetails,
      phone: unit.phone,
      whatsapp: unit.whatsapp,
      logo: unit.logo,
      amenities: unit.amenities,
      photos: unit.photos,
      businessHours: unit.businessHours,
      holidays: unit.holidays,
    };
  }
}
