import { UnitHoliday, UnitHoursRange } from '@/modules/site/api/unit';
import { usePublicUnit } from '@/modules/site/hooks/use-public-unit';

import { BUSINESS_TIME_ZONE } from '@/shared/lib/time';

import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function dateInBusinessTimeZone(value: Date | string | number): Date {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return date;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);

  return new Date(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
}

export function formatBRL(cents: number): string {
  if (!Number.isFinite(cents)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} h`;
  return `${hours} h ${remainder} min`;
}

export function formatDate(value: Date | string | number, pattern = "dd 'de' MMMM 'de' yyyy"): string {
  const date = dateInBusinessTimeZone(value);
  return isValid(date) ? format(date, pattern, { locale: ptBR }) : '—';
}

export function formatDateTime(value: Date | string | number): string {
  const date = dateInBusinessTimeZone(value);
  return isValid(date) ? format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—';
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  const ddd = digits.slice(0, 2);
  const number = digits.slice(2, 11);
  if (number.length <= 4) return `(${ddd}) ${number}`;
  if (number.length <= 8) return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
  return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5, 9)}`;
}

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
}

function getRangeEdges(range: UnitHoursRange): { start: string; end: string } {
  return 'start' in range ? range : { start: range[0], end: range[1] };
}

export function formatRanges(ranges?: UnitHoursRange[]): string {
  if (!ranges?.length) return 'Fechado';
  return ranges
    .map((range) => {
      const { start, end } = getRangeEdges(range);
      return `${start}–${end}`;
    })
    .join(' · ');
}

export function getBusinessDate(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function getUpcomingHolidays(holidays: UnitHoliday[] | undefined): UnitHoliday[] {
  const today = getBusinessDate(new Date());
  return (holidays ?? []).filter((holiday) => holiday.date >= today).sort((left, right) => left.date.localeCompare(right.date));
}

export function toWhatsAppUrl(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`;
}

const footerWeekdays = [
  { weekday: 1, label: 'Seg' },
  { weekday: 2, label: 'Ter' },
  { weekday: 3, label: 'Qua' },
  { weekday: 4, label: 'Qui' },
  { weekday: 5, label: 'Sex' },
  { weekday: 6, label: 'Sáb' },
  { weekday: 0, label: 'Dom' },
];

export function footerHours(unit?: ReturnType<typeof usePublicUnit>['unit']) {
  if (!unit?.businessHours?.length) return null;
  return footerWeekdays.map((day) => {
    const ranges = unit.businessHours?.find((item) => Number(item.weekday) === day.weekday)?.ranges ?? [];
    const hours =
      ranges.length ?
        ranges
          .map((range) => {
            const [start, end] = Array.isArray(range) ? range : [range.start, range.end];
            return `${start}–${end}`;
          })
          .join(' · ')
      : 'Fechado';
    return { label: day.label, hours };
  });
}
