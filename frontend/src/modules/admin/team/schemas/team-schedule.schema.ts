import { z } from 'zod';

const intervalSchema = z
  .object({ start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.'), end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.') })
  .refine((interval) => interval.start < interval.end, 'O fim precisa ser depois do início.');

export const teamScheduleSchema = z.object({
  days: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), ranges: z.array(intervalSchema).max(6), breaks: z.array(intervalSchema).max(6) }))
    .length(7, 'A escala precisa incluir os sete dias.'),
});

export type TeamScheduleValues = z.infer<typeof teamScheduleSchema>;
