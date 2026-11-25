import { z } from 'zod';

const rangeSchema = z
  .object({ start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.'), end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.') })
  .refine((range) => range.start < range.end, 'O fim deve ser depois do início.');

export const businessHoursSchema = z
  .object({
    businessHours: z.array(z.object({ weekday: z.number().int().min(0).max(6), ranges: z.array(rangeSchema).max(6) })).length(7),
    holidays: z.array(z.object({ date: z.string().date(), name: z.string().trim().min(1).max(120), closed: z.boolean(), ranges: z.array(rangeSchema).max(6) })).max(200),
  })
  .superRefine((value, context) => {
    const weekdays = new Set(value.businessHours.map((item) => item.weekday));
    if (weekdays.size !== 7) context.addIssue({ code: 'custom', message: 'Informe os sete dias da semana.', path: ['businessHours'] });
    for (const day of value.businessHours) {
      const ranges = [...day.ranges].sort((left, right) => left.start.localeCompare(right.start));
      for (let index = 1; index < ranges.length; index += 1) {
        if (ranges[index].start < ranges[index - 1].end) context.addIssue({ code: 'custom', message: 'As faixas do dia não podem se sobrepor.', path: ['businessHours'] });
      }
    }
    const dates = value.holidays.map((item) => item.date);
    if (new Set(dates).size !== dates.length) context.addIssue({ code: 'custom', message: 'Cada data deve aparecer somente uma vez.', path: ['holidays'] });
  });

export type BusinessHoursValues = z.infer<typeof businessHoursSchema>;
