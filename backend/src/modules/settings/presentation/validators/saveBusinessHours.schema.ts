import { timeToMinutes } from '@/modules/settings/domain/services/businessSchedule';

import { z } from '@/shared/openapi/zod';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const RANGE_MESSAGE = 'Confira os horários de funcionamento.';

function isRealDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;

  const parsed = new Date(`${value}T12:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const timeRangeSchema = z
  .object({
    start: z.string().regex(TIME_REGEX, RANGE_MESSAGE).openapi({ example: '08:00' }),
    end: z.string().regex(TIME_REGEX, RANGE_MESSAGE).openapi({ example: '20:00' }),
  })
  .refine((range) => timeToMinutes(range.start) < timeToMinutes(range.end), { message: RANGE_MESSAGE, path: ['end'] });

const rangesSchema = z
  .array(timeRangeSchema)
  .max(6, 'Cada dia pode ter até seis faixas de funcionamento.')
  .superRefine((ranges, ctx) => {
    const sorted = ranges.map(({ start, end }) => ({ start: timeToMinutes(start), end: timeToMinutes(end) })).sort((a, b) => a.start - b.start);

    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].start < sorted[index - 1].end) {
        ctx.addIssue({ code: 'custom', message: 'As faixas de funcionamento não podem se sobrepor.' });
        return;
      }
    }
  });

const businessHourSchema = z.object({
  weekday: z.number().int('Confira os dias da semana.').min(0, 'Confira os dias da semana.').max(6, 'Confira os dias da semana.').openapi({
    example: 1,
    description: '0 = domingo ... 6 = sábado',
  }),
  ranges: rangesSchema,
});

const holidaySchema = z.object({
  date: z.string().refine(isRealDate, 'As datas dos feriados precisam ser válidas e únicas.').openapi({ example: '2026-12-25' }),
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome do feriado.')
    .max(120, 'O nome do feriado deve ter no máximo 120 caracteres.')
    .openapi({ example: 'Natal' }),
  closed: z.boolean().default(false).openapi({ example: true }),
  ranges: rangesSchema.default([]).openapi({ description: 'Ignoradas quando `closed` é true.' }),
});

export const saveBusinessHoursBodySchema = z.object({
  businessHours: z
    .array(businessHourSchema)
    .length(7, 'Informe os horários dos sete dias da semana.')
    .superRefine((days, ctx) => {
      if (new Set(days.map((day) => day.weekday)).size !== days.length) {
        ctx.addIssue({ code: 'custom', message: 'Confira os dias da semana.' });
      }
    }),
  holidays: z
    .array(holidaySchema)
    .max(200, 'Confira a lista de feriados e exceções.')
    .superRefine((holidays, ctx) => {
      if (new Set(holidays.map((holiday) => holiday.date)).size !== holidays.length) {
        ctx.addIssue({ code: 'custom', message: 'As datas dos feriados precisam ser válidas e únicas.' });
      }
    }),
  confirmAffected: z.boolean().default(false).openapi({
    example: false,
    description: 'Confirma a gravação mesmo que agendamentos futuros fiquem fora do novo expediente.',
  }),
});

export type SaveBusinessHoursBody = z.infer<typeof saveBusinessHoursBodySchema>;
