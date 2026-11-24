import type { BusinessSettings } from '@/modules/settings/domain/entities/BusinessSettings';
import { Unit } from '@/modules/settings/domain/entities/Unit';

export interface ISettingsRepository {
  findBusinessByUnitId(unitId: string): Promise<BusinessSettings | null>;
  saveBusiness(unit: Unit, business: BusinessSettings): Promise<void>;
}
