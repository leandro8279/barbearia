import type { Unit } from '@/modules/settings/domain/entities/Unit';

export interface IUnitRepository {
  /** Unidade principal: a mais antiga cadastrada. */
  findPrimary(): Promise<Unit | null>;
}
