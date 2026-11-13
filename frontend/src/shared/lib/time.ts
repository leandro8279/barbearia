import type { TimeInterval } from '@/shared/types/domain';

export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';
export const FIXED_OFFSET = '-03:00';
export const FIXED_OFFSET_MINUTES = -180;

export function minutesToHHmm(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
    throw new RangeError('Os minutos precisam ser um número positivo.');
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function hhmmToMinutes(value: string): number {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value);
  if (!match) throw new TypeError(`Horário inválido: ${value}`);
  const hours = Number(match[1]);
  if (hours > 23) throw new RangeError(`Horário fora do dia: ${value}`);
  return hours * 60 + Number(match[2]);
}

export function addMinutesToHHmm(value: string, minutes: number): string {
  return minutesToHHmm(hhmmToMinutes(value) + minutes);
}

export function parseSaoPauloISO(value: string): Date {
  const input =
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00${FIXED_OFFSET}`
    : value.includes('T') && !/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? `${value}${FIXED_OFFSET}`
    : value;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) throw new TypeError(`Data inválida: ${value}`);
  return date;
}

export function toSaoPauloISO(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new TypeError('Data inválida.');
  const wallClock = new Date(value.getTime() + FIXED_OFFSET_MINUTES * 60_000);
  const datePart = wallClock.toISOString().slice(0, 19);
  return `${datePart}${FIXED_OFFSET}`;
}

export function overlaps(a: TimeInterval, b: TimeInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function isWithinInterval(candidate: TimeInterval, container: TimeInterval): boolean {
  return candidate.start >= container.start && candidate.end <= container.end && candidate.start < candidate.end;
}

export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  const sorted = [...intervals].filter((interval) => interval.start < interval.end).sort((a, b) => a.start - b.start);
  const merged: TimeInterval[] = [];

  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (!previous || interval.start > previous.end) {
      merged.push({ ...interval });
    } else {
      previous.end = Math.max(previous.end, interval.end);
    }
  }

  return merged;
}
