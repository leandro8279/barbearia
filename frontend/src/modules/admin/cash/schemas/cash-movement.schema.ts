import { z } from 'zod';

export const cashMovementSchema = z.object({
  type: z.enum(['withdraw', 'supply']),
  amountCents: z.number().int('Informe um valor inteiro em centavos.').min(1, 'O valor deve ser maior que zero.'),
  reason: z.string().trim().min(3, 'Informe um motivo com pelo menos 3 caracteres.').max(250, 'O motivo deve ter até 250 caracteres.'),
});

export type CashMovementValues = z.infer<typeof cashMovementSchema>;
