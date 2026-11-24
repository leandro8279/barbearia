import type { BusinessHour, Holiday, TimeRange } from '@/modules/settings/domain/entities/Unit';

const LOCAL_UTC_OFFSET_MS = -3 * 60 * 60 * 1000;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface Schedule {
  businessHours: BusinessHour[];
  holidays: Holiday[];
}

export interface AppointmentWindow {
  start: Date;
  end: Date;
}

const toLocal = (date: Date) => new Date(date.getTime() + LOCAL_UTC_OFFSET_MS);

export function timeToMinutes(value: string): number {
  const match = TIME_REGEX.exec(value);

  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
}

export function localDateString(date: Date): string {
  return toLocal(date).toISOString().slice(0, 10);
}

export function localMinutes(date: Date): number {
  const local = toLocal(date);

  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

const sortRanges = (ranges: TimeRange[]): TimeRange[] =>
  ranges.map(({ start, end }) => ({ start, end })).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

export function normalizeSchedule({ businessHours, holidays }: Schedule): Schedule {
  return {
    businessHours: businessHours.map(({ weekday, ranges }) => ({ weekday, ranges: sortRanges(ranges) })).sort((a, b) => a.weekday - b.weekday),
    holidays: holidays
      .map(({ date, name, closed, ranges }) => ({ date, name: name.trim(), closed, ranges: closed ? [] : sortRanges(ranges) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function rangesForDate({ businessHours, holidays }: Schedule, date: string): TimeRange[] {
  const holiday = holidays.find((item) => item.date === date);
  if (holiday) return holiday.closed ? [] : holiday.ranges;

  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();

  return businessHours.find((item) => item.weekday === weekday)?.ranges ?? [];
}

export function isOutsideSchedule(schedule: Schedule, { start, end }: AppointmentWindow): boolean {
  const date = localDateString(start);
  if (date !== localDateString(end)) return true;

  const startMinute = localMinutes(start);
  const endMinute = localMinutes(end);

  return !rangesForDate(schedule, date).some((range) => startMinute >= timeToMinutes(range.start) && endMinute <= timeToMinutes(range.end));
}
