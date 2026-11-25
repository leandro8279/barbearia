/** A barbearia opera em America/Sao_Paulo (UTC-3, sem horário de verão). */
const LOCAL_UTC_OFFSET_MS = -3 * 60 * 60 * 1000;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Período inclusivo nas duas pontas. */
export interface FinancePeriod {
  start: Date;
  end: Date;
}

export const isDateOnly = (value: string): boolean => DATE_ONLY_REGEX.test(value);

export function localDateString(date: Date): string {
  return new Date(date.getTime() + LOCAL_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

export const monthKey = (date: Date): string => localDateString(date).slice(0, 7);

/** `AAAA-MM-DD` vale no fuso local (início ou fim do dia); qualquer outro texto passa por `new Date`. */
export function parseBoundary(value: string, endOfDay: boolean): Date | null {
  const input = value.trim();

  if (isDateOnly(input)) {
    const parsed = new Date(`${input}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}-03:00`);

    // Recusa datas que "rolam" (2026-02-31).
    return !Number.isNaN(parsed.getTime()) && localDateString(parsed) === input ? parsed : null;
  }

  const parsed = new Date(input);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolvePeriod(from: string, to: string): FinancePeriod | null {
  const start = parseBoundary(from, false);
  const end = parseBoundary(to, isDateOnly(to.trim()));

  return start && end && end.getTime() >= start.getTime() ? { start, end } : null;
}

/** Janela imediatamente anterior, com a mesma duração. */
export function previousPeriod({ start, end }: FinancePeriod): FinancePeriod {
  const duration = end.getTime() - start.getTime() + 1;

  return { start: new Date(start.getTime() - duration), end: new Date(start.getTime() - 1) };
}

export function monthKeys({ start, end }: FinancePeriod): string[] {
  const [startYear, startMonth] = monthKey(start).split('-').map(Number);
  const [endYear, endMonth] = monthKey(end).split('-').map(Number);
  const keys: string[] = [];

  for (let index = startYear * 12 + startMonth - 1; index <= endYear * 12 + endMonth - 1; index += 1) {
    keys.push(`${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`);
  }

  return keys;
}
