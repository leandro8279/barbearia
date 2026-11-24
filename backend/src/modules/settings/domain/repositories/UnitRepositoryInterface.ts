import type { Unit } from '@/modules/settings/domain/entities/Unit';

export interface IUnitRepository {
  findPrimary(): Promise<Unit | null>;
  updateSchedule(unit: Unit): Promise<void>;
}
