import { z } from 'zod';

export const createAppointmentSchema = z.object({
  customerId: z.string().min(1, 'Selecione um cliente.'),
  serviceIds: z.array(z.string()).min(1, 'Selecione pelo menos um serviço.').max(4, 'Selecione até quatro serviços.'),
  barberId: z.string().min(1, 'Selecione um barbeiro.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.'),
  start: z.string().min(1, 'Selecione um horário disponível.'),
  notes: z.string().max(500, 'As observações devem ter até 500 caracteres.'),
  expectedPaymentMethod: z.enum(['', 'cash', 'pix', 'debit', 'credit']),
  bypassAdvance: z.boolean(),
  allowOutOfHours: z.boolean(),
});

export type CreateAppointmentValues = z.infer<typeof createAppointmentSchema>;
