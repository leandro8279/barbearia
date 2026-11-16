import { CalendarBlock } from '@/shared/components/calendar-grid';
import { BUSINESS_TIME_ZONE, FIXED_OFFSET } from '@/shared/lib/time';

export function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00${FIXED_OFFSET}`);
}

export function todayInBusinessTimeZone() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(new Date());
}

export function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

type AgendaView = 'day' | 'week';

export function dateRange(view: AgendaView, date: string) {
  const from = view === 'week' ? startOfWeek(date) : date;
  return { from, to: view === 'week' ? shiftDate(from.toString(), 6) : from };
}

export function timeValue(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function rangeValue(range: { start: string; end: string } | [string, string]) {
  return Array.isArray(range) ?
      { start: timeValue(range[0]), end: timeValue(range[1]) }
    : { start: timeValue(range.start), end: timeValue(range.end) };
}

export function isoAt(date: string, minute: number) {
  const offsetDays = Math.floor(minute / 1440);
  const time = ((minute % 1440) + 1440) % 1440;
  const targetDate = new Date(`${date}T12:00:00.000Z`);
  targetDate.setUTCDate(targetDate.getUTCDate() + offsetDays);
  return `${targetDate.toISOString().slice(0, 10)}T${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}:00${FIXED_OFFSET}`;
}

export function buildUnitHours(
  unit:
    | {
        businessHours?: Array<{ weekday: number; ranges: Array<{ start: string; end: string } | [string, string]> }>;
        holidays?: Array<{ date: string; name: string; closed?: boolean; ranges?: Array<{ start: string; end: string } | [string, string]> }>;
      }
    | null
    | undefined,
  days: string[],
) {
  const perDay = days.map((day) => {
    const weekday = new Date(`${day}T12:00:00.000Z`).getUTCDay();
    const holiday = unit?.holidays?.find((item) => item.date === day);
    const regularHours = unit?.businessHours?.find((item) => Number(item.weekday) === weekday);
    const ranges = holiday?.closed ? [] : (holiday?.ranges ?? regularHours?.ranges ?? []).map(rangeValue).filter((range) => range.start < range.end);
    return { day, holidayName: holiday?.name, ranges };
  });
  const allRanges = perDay.flatMap((item) => item.ranges);
  const startHour = allRanges.length ? Math.floor(Math.min(...allRanges.map((range) => range.start)) / 60) : 8;
  const endHour = allRanges.length ? Math.ceil(Math.max(...allRanges.map((range) => range.end)) / 60) : 20;
  const closedBlocks: CalendarBlock[] = [];

  for (const item of perDay) {
    let cursor = startHour * 60;
    if (!item.ranges.length) {
      closedBlocks.push({
        id: `closed-${item.day}`,
        barberId: null,
        startsAt: isoAt(item.day, startHour * 60),
        endsAt: isoAt(item.day, endHour * 60),
        reason: item.holidayName || 'Unidade fechada',
      });
      continue;
    }
    const ranges = [...item.ranges].sort((left, right) => left.start - right.start);
    for (const range of ranges) {
      if (range.start > cursor) {
        closedBlocks.push({
          id: `closed-${item.day}-${cursor}`,
          barberId: null,
          startsAt: isoAt(item.day, cursor),
          endsAt: isoAt(item.day, range.start),
          reason: 'Fora do horário de funcionamento',
        });
      }
      cursor = Math.max(cursor, range.end);
    }
    if (cursor < endHour * 60) {
      closedBlocks.push({
        id: `closed-${item.day}-${cursor}`,
        barberId: null,
        startsAt: isoAt(item.day, cursor),
        endsAt: isoAt(item.day, endHour * 60),
        reason: 'Fora do horário de funcionamento',
      });
    }
  }

  return { startHour, endHour: Math.max(startHour + 1, endHour), closedBlocks };
}

export function visibleDays(from: string, to: string) {
  const days: string[] = [];
  let current = from;
  while (current <= to) {
    days.push(current);
    current = shiftDate(current, 1);
  }
  return days;
}
