import { z } from 'zod';

export const cancelAppointmentSchema = z
  .object({ reason: z.enum(['change_of_plans', 'schedule_conflict', 'other']), details: z.string().trim().max(300, 'Use até 300 caracteres.').optional() })
  .superRefine((values, context) => {
    if (values.reason === 'other' && !values.details) {
      context.addIssue({ code: 'custom', message: 'Conte brevemente o motivo do cancelamento.', path: ['details'] });
    }
  });

export type CancelAppointmentValues = z.infer<typeof cancelAppointmentSchema>;
