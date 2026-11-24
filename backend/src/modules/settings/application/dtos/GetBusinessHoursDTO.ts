import type { BusinessHour, Unit } from '@/modules/settings/domain/entities/Unit';
import { ListedHoliday, mergeHolidays } from '@/modules/settings/domain/services/holidayCalendar';

import type { Holiday } from '@/modules/settings/domain/entities/Unit';

export type HolidayItemDTO = ListedHoliday;

export interface GetBusinessHoursResponseDTO {
  businessHours: BusinessHour[];
  holidays: HolidayItemDTO[];
}

export function toGetBusinessHoursResponse(unit: Unit, defaultHolidays: Holiday[]): GetBusinessHoursResponseDTO {
  return {
    businessHours: unit.businessHours,
    holidays: mergeHolidays(unit.holidays, defaultHolidays),
  };
}
