import { z } from 'zod';

export const timeOffSchema = z
  .object({
    barberIds: z.array(z.number().int().positive()).min(1, 'Selecione ao menos um profissional.'),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data inicial.'),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data final.'),
    allDay: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    reason: z.enum(['Folga', 'Férias', 'Atestado', 'Curso']),
  })
  .superRefine((values, context) => {
    if (values.toDate < values.fromDate) context.addIssue({ code: 'custom', path: ['toDate'], message: 'A data final deve ser igual ou posterior à inicial.' });
    if (!values.allDay && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.endTime) || values.startTime >= values.endTime)) {
      context.addIssue({ code: 'custom', path: ['endTime'], message: 'O horário final precisa ser depois do inicial.' });
    }
  });

export type TimeOffValues = z.infer<typeof timeOffSchema>;
