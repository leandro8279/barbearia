import type { BusinessSettings, BusinessSocials } from '@/modules/settings/domain/entities/BusinessSettings';
import type { BusinessHour, Holiday, Unit, UnitAddressDetails } from '@/modules/settings/domain/entities/Unit';

export interface BusinessUnitDTO {
  id: string;
  name: string;
  address: string;
  addressDetails: UnitAddressDetails;
  phone: string;
  whatsapp: string;
  logo: string | null;
  amenities: string[];
  photos: string[];
  businessHours: BusinessHour[];
  holidays: Holiday[];
}

export interface BusinessInfoDTO {
  unitId: string;
  name: string;
  cnpj: string;
  email: string;
  socials: BusinessSocials;
  timezone: string;
}

export interface GetBusinessSettingsResponseDTO {
  unit: BusinessUnitDTO;
  business: BusinessInfoDTO;
}

export function toGetBusinessSettingsResponse(unit: Unit, business: BusinessSettings): GetBusinessSettingsResponseDTO {
  return {
    unit: {
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
    },
    business: {
      unitId: business.unitId,
      name: business.name,
      cnpj: business.cnpj,
      email: business.email,
      socials: business.socials,
      timezone: business.timezone,
    },
  };
}
