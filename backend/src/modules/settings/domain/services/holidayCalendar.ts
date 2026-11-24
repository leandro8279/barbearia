import type { Holiday } from '@/modules/settings/domain/entities/Unit';

export interface ListedHoliday extends Holiday {
  isDefault: boolean;
}

const DEFAULT_HOLIDAYS: ReadonlyArray<readonly [monthDay: string, name: string]> = [
  ['01-01', 'Confraternização Universal'],
  ['01-25', 'Aniversário da cidade de São Paulo'],
  ['04-21', 'Tiradentes'],
  ['05-01', 'Dia do Trabalho'],
  ['07-09', 'Revolução Constitucionalista de 1932'],
  ['09-07', 'Independência do Brasil'],
  ['10-12', 'Nossa Senhora Aparecida'],
  ['11-02', 'Finados'],
  ['11-15', 'Proclamação da República'],
  ['11-20', 'Dia Nacional de Zumbi e da Consciência Negra'],
  ['12-25', 'Natal'],
];

export function buildDefaultHolidays(referenceYear: number): Holiday[] {
  return [referenceYear - 1, referenceYear, referenceYear + 1, referenceYear + 2].flatMap((year) =>
    DEFAULT_HOLIDAYS.map(([monthDay, name]) => ({ date: `${year}-${monthDay}`, name, closed: true, ranges: [] })),
  );
}

export function mergeHolidays(saved: Holiday[], defaults: Holiday[]): ListedHoliday[] {
  const defaultDates = new Set(defaults.map((holiday) => holiday.date));
  const savedDates = new Set(saved.map((holiday) => holiday.date));

  return [
    ...saved.map((holiday) => ({ ...holiday, isDefault: defaultDates.has(holiday.date) })),
    ...defaults.filter((holiday) => !savedDates.has(holiday.date)).map((holiday) => ({ ...holiday, isDefault: true })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}
