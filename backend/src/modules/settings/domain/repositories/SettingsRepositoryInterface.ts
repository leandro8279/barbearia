import type { BusinessSettings } from '@/modules/settings/domain/entities/BusinessSettings';

export interface ISettingsRepository {
  findBusinessByUnitId(unitId: string): Promise<BusinessSettings | null>;
}
