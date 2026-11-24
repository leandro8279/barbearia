import type { BusinessSocials } from '@/modules/settings/domain/entities/BusinessSettings';
import type { UnitAddressDetails } from '@/modules/settings/domain/entities/Unit';

export interface UpdateBusinessSettingsDTO {
  name: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  addressDetails: UnitAddressDetails;
  logo: string | null;
  photos: string[];
  amenities: string[];
  socials: BusinessSocials;
  actorId: string;
}
